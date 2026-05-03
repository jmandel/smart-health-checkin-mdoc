### 9.7 Phone resolution and re-entry into §8

This subsection defines phone-side processing after a Holder opens a Pointer URL created under §9.6. The Phone presenter resolves the pointer, retrieves the encrypted kiosk request state, opens and verifies the kiosk wrapper, validates the embedded SMART request, and then re-enters the same-device `org-iso-mdoc` flow defined in §8 on the phone.

The kiosk wrapper is not a second clinical protocol. The Pointer URL, QR code, provider row, encrypted request envelope, and kiosk request JWS do not carry a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, Wallet response, SMART response, or response-submission ciphertext. Same-device §8 request construction happens on the phone only after successful wrapper validation and SMART request validation.

This subsection stops at the handoff to later kiosk submission processing. The signed `encryptResponseTo` and `constraints` members are preserved as metadata for §§9.8-9.12, but this subsection does not define response-submission plaintext, response-submission encryption, provider write behavior, replay or single-use behavior, Completion display processing, or desktop completion status.

#### 9.7.1 Parse the Pointer URL

A Phone presenter that supports the active §9.6 pointer format SHALL parse the URL fragment as form-style parameters and SHALL read fragment parameter `r` as the kiosk wrapper request identifier. This subsection calls that value `pointerRequestId`.

A Phone presenter SHALL reject the pointer before request lookup when `r` is absent, empty, malformed under the selected deployment's identifier policy, or otherwise unavailable to the Phone presenter. A Phone presenter SHALL NOT infer a kiosk request identifier from plaintext request-looking fields, inline §8 `DeviceRequest` values, inline §8 `encryptionInfo`, query parameters not defined by the selected pointer profile, page display text, or cached UI state.

`pointerRequestId` is a bearer locator for protected kiosk request state. It is not the clinical SMART request identifier, not Holder consent, not requester authentication, not patient identity, not clinical-source provenance, and not authorization to disclose or consume clinical content.

#### 9.7.2 Retrieve the provider request row or encrypted envelope

The Phone presenter SHALL use `pointerRequestId` and configured provider or deployment routing information to fetch or read the provider request row, encrypted request envelope, or equivalent lookup result associated with that pointer.

For the active provider row shape, the row contains a row-level wrapper request id and an encrypted request envelope:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

A Submission service MAY enforce access-control, row-shape, rate-limit, anti-enumeration, coarse-expiration, cleanup, or provider-local policy checks before returning an envelope. These relay checks are defense in depth. The Phone presenter SHALL still perform the cryptographic validation, request-id binding, creator trust evaluation, expiration and freshness checks, provider binding checks, embedded SMART request validation, and §8 processing defined in this subsection.

A Phone presenter SHALL fail safely before Wallet invocation when the provider is not configured, the provider is unavailable, no row or envelope is found, the lookup result is ambiguous, the row is malformed, or the encrypted envelope is absent.

#### 9.7.3 Bind the wrapper request identifiers

Before invoking §8, the Phone presenter SHALL establish that the pointer, provider lookup result, encrypted envelope, and signed kiosk payload identify the same kiosk wrapper request.

At minimum, the Phone presenter SHALL compare these values by exact string equality:

1. the Pointer URL fragment parameter `r`;
2. the provider row or lookup-level `requestId`, when the selected provider shape exposes one;
3. `EncryptedKioskRequest.requestId`; and
4. after successful JWS verification, `KioskRequestPayload.requestId`.

A Phone presenter SHALL reject the kiosk request if any required value is missing or if any required equality check fails. This binding is a wrapper and relay-correlation binding. It does not permit substituting the wrapper `requestId` for `smartRequest.id`, and it does not change the §6 rule that `SmartHealthCheckinResponse.requestId` later equals the clinical SMART request `id`.

Where a selected provider profile defines envelope metadata as mirrors of signed or protected-header values, the Phone presenter SHALL validate those mirrored values according to that profile. In the active version 1 profile, envelope timestamps and key ids are intended to correspond to the signed payload and protected-header metadata; exact fixture-level treatment is defined by the kiosk schema and fixture material.

#### 9.7.4 Validate the encrypted request envelope

Before attempting decryption, the Phone presenter SHALL validate that the encrypted request envelope uses the active request-envelope profile. It SHALL require:

- `v` equal to numeric `1`;
- `alg` equal to `ECDH-P256+HKDF-SHA256+AES-GCM`;
- `enc` equal to `A256GCM`;
- `contentType` equal to `application/smart-health-checkin-kiosk-request+jws+aesgcm`;
- non-empty string values for `requestId`, `creatorKeyId`, `recipientKeyId`, `iv`, and `ciphertext`;
- numeric values for `createdAt` and `expiresAt`; and
- an `ephemeralPublicKeyJwk` usable as a P-256 ECDH public key for the request-envelope suite.

The Phone presenter SHALL reject an envelope whose `requestId` does not satisfy §9.7.3. The Phone presenter SHALL reject an envelope whose `expiresAt` has passed at the validation time. The Phone presenter SHALL reject an envelope whose `createdAt` is unacceptably far in the future or whose `createdAt`/`expiresAt` relationship violates the selected freshness policy. A deployment profile SHOULD define the accepted clock-skew window and any maximum lifetime for kiosk request processing.

The Phone presenter SHALL verify that request-opening private key material available to the Phone presenter, or to a deployment-approved trusted component acting on its behalf, corresponds to the envelope `recipientKeyId` and is acceptable for this provider, audience, and use. A deployment that treats the Submission service as an untrusted relay SHALL NOT require that untrusted relay to possess request-opening private key material merely to route or serve encrypted request state. Browser-delivered demo request-opening private keys are demonstration behavior only and are not a production key-management pattern.

#### 9.7.5 Open the `EncryptedKioskRequest`

The Phone presenter SHALL open the encrypted request envelope using the §9.3 request-envelope construction:

```text
ECDH P-256 shared secret = ECDH(request-opening private key, envelope.ephemeralPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(envelope.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(envelope.iv)
AES-GCM AAD              = utf8(envelope.requestId)
plaintext                = compact kiosk request JWS UTF-8 text
```

The Phone presenter SHALL reject the kiosk request if base64url decoding fails, the ephemeral public key cannot be imported or is unacceptable, key agreement fails, AES-GCM authentication fails, plaintext decoding as UTF-8 fails, or the plaintext is not a compact JWS with exactly three non-empty segments. On decryption or opening failure, the Phone presenter SHALL NOT recover a SMART request from unauthenticated bytes, provider metadata, URL text, cached display text, or other fallback inputs.

#### 9.7.6 Verify the compact kiosk request JWS and signed payload

After decryption, the Phone presenter SHALL verify the compact kiosk request JWS before using any payload field. The Phone presenter SHALL:

1. require the compact JWS to have exactly three non-empty base64url segments;
2. parse the protected header as a JSON object;
3. require protected-header `alg` equal to `ES256`;
4. require protected-header `typ` equal to `smart-health-checkin+kiosk-request+jws`;
5. require protected-header `kid` to be a non-empty string;
6. resolve `kid` to a Kiosk creator public key that is trusted under deployment policy for kiosk request creation, the provider context, the audience, and the use being attempted;
7. verify the ES256 signature over the exact compact-JWS signing input; and
8. reject the request if the header is malformed, the algorithm or type is unsupported, the `kid` is unknown or untrusted, the key is not acceptable for this use, or the signature does not verify.

After signature verification, the Phone presenter SHALL parse the payload as a `KioskRequestPayload` JSON object and SHALL validate at least these signed fields before same-device re-entry:

1. `v` is numeric `1`.
2. `requestId` satisfies all request-id bindings in §9.7.3.
3. `iss` is acceptable under deployment Kiosk creator trust policy.
4. `aud` is acceptable under the request-opening, Phone presenter, provider, or deployment audience policy.
5. `createdAt` and `expiresAt` are valid time values for this profile, `expiresAt` is later than `createdAt`, the request has not expired, and `createdAt` is not unacceptably far in the future under clock-skew policy.
6. `submitTo` identifies the provider context from which the Phone presenter retrieved the request. For the active provider shape, `submitTo.backend` is `instantdb` and `submitTo.appId` matches the configured provider application id.
7. `encryptRequestTo.alg` is `ECDH-P256+HKDF-SHA256+AES-GCM`, and `encryptRequestTo.keyId` is consistent with `EncryptedKioskRequest.recipientKeyId` and the request-opening key accepted under deployment policy.
8. `encryptResponseTo.alg` is a supported response-submission algorithm label for the selected kiosk profile. The Phone presenter SHALL preserve the remaining `encryptResponseTo` metadata for §§9.8-9.12 and SHALL NOT treat it as §8 `encryptionInfo`.
9. `constraints` is syntactically valid and acceptable under implementation and deployment limits. For the active field, `constraints.maxPlaintextBytes` is signed metadata for later submission processing; an implementation SHOULD reject a value it is unwilling or unable to enforce later.
10. `minter.keyId`, when present, is consistent with the protected-header `kid` or is otherwise acceptable under deployment creator-key policy.

The Phone presenter SHALL reject the kiosk request if the payload is malformed, a required field is missing, issuer or audience policy fails, freshness checks fail, provider binding fails, algorithm labels are unsupported, constraints are unacceptable, key identifiers are inconsistent under policy, or any required request-id binding fails. Demo issuer strings, audience strings, provider app ids, and checked-in demo keys are not universal production trust anchors.

#### 9.7.7 Validate and retain the embedded SMART request

The `KioskRequestPayload.smartRequest` member is the complete clinical SMART request for the check-in interaction. The Phone presenter SHALL require `smartRequest` to be present as a JSON object and SHALL validate it as a `SmartHealthCheckinRequest` under §5 before invoking §8.

A Phone presenter SHALL reject a kiosk payload that omits `smartRequest`, makes `smartRequest` non-object data, or replaces the §5 SMART request with `request`, `requestProfile`, `preset`, `presetId`, IPS shortcut, profile-family shortcut, “all of the above” label, SDK helper object, legacy inline §8 request fragment, or any other wrapper in place of the SMART request.

The Phone presenter SHALL preserve the distinction between these identifiers:

- `KioskRequestPayload.requestId` is the kiosk wrapper identifier used for pointer lookup, provider row binding, envelope binding, signed-payload binding, expiration checks, and later kiosk-session correlation.
- `KioskRequestPayload.smartRequest.id` is the clinical SMART request identifier. The Wallet/Responder uses this value as the `SmartHealthCheckinResponse.requestId` under §6 when constructing a SMART response.

A Phone presenter, Wallet/Responder, Verifier, Requester, Submission service, or Completion display SHALL NOT substitute one identifier for the other.

A Phone presenter MAY display Holder-facing context from the validated SMART request, including `purpose`, request item `title`, request item `summary`, advisory `required` values, accepted media types, and requested content categories. If it displays this context, it SHALL distinguish unauthenticated SMART request display text from authenticated origin, reader, creator, provider, or deployment-trust information. Successful kiosk wrapper verification does not make `purpose`, item text, selector URLs, pointer metadata, provider application ids, row ids, or key ids authenticated requester identity.

#### 9.7.8 Re-enter the same-device `org-iso-mdoc` flow

Only after successful pointer parsing, request retrieval, request-id binding, envelope validation, envelope opening, JWS verification, creator-trust evaluation, provider binding, freshness validation, and embedded SMART request validation, the Phone presenter SHALL invoke or participate in the same-device `org-iso-mdoc` flow defined in §8 using the validated `smartRequest` as the SMART request for that phone-local flow.

For this re-entry, the Phone presenter acts as the phone-local Verifier for §8. It SHALL construct a fresh §8 request on the phone. In particular, it SHALL:

1. serialize the validated SMART request as JSON text for `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
2. construct the §8 `ItemsRequest`, tag-24 `DocRequest.itemsRequest`, `DeviceRequest` version `"1.0"`, optional `readerAuth`, and direct `org-iso-mdoc` Digital Credentials API request shape according to §8.2;
3. generate or select the §8 HPKE recipient key material and `encryptionInfo` for the phone-local presentation session according to §8.2.5;
4. derive the §8 `SessionTranscript` from the exact phone-local `encryptionInfo` base64url string and the authenticated phone-local origin or deployment-approved origin-equivalent under §8.3;
5. invoke the Wallet/Responder through the Digital Credentials API, privileged-caller mechanism, or deployment-approved same-device presentation surface using protocol `org-iso-mdoc`; and
6. retain the original validated `smartRequest` and §8 validation state needed for §8.7, §8.8, and §6.6 processing.

The Phone presenter SHALL NOT reuse, import, or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 HPKE recipient key, §8 `SessionTranscript`, Wallet `DeviceResponse`, Digital Credentials API response, or SMART response from the QR code, Pointer URL, provider row, encrypted kiosk request envelope, or kiosk request JWS. Legacy or experimental URL fragments that inline `deviceRequest`, `encryptionInfo`, or similar same-device request material are not the active version 1.0 kiosk pointer profile.

The Wallet/Responder remains responsible for §8 Wallet-side request validation, Holder review, Wallet policy, response construction under §6, mdoc response construction, and same-device response encryption. Scanning or opening a Pointer URL loads a request for review and validation; it is not Holder consent and does not authorize the Phone presenter to fabricate or submit clinical content.

If same-device invocation is unavailable, unsupported by the phone browser or platform, blocked by Wallet policy, cancelled by the Holder, or fails before a Wallet response is produced, the Phone presenter SHALL fail safely and SHALL NOT synthesize a SMART response or claim kiosk completion. Any later non-clinical status conveyed to the kiosk side is governed by §§9.8-9.12 or by a deployment profile.

#### 9.7.9 Preserve trust boundaries

A Phone presenter, Wallet/Responder, Verifier, Requester, Completion display, Submission service, downstream receiver, or deployment profile SHALL preserve the trust-layer separation defined in §7.

Successful kiosk wrapper decryption and creator-JWS verification prove only the wrapper properties validated under this subsection and deployment policy. They do not prove Holder consent, patient identity, Wallet authenticity, mdoc issuer trust, device-key proof, reader authentication for the §8 flow, requester identity through display fields, clinical-source provenance, downstream EHR write-back authorization, or legal authority to consume returned content.

A Wallet/Responder SHALL continue to apply §7 and §8 trust processing for the phone-local presentation. A Verifier, Requester, Completion display, or downstream receiver that later consumes a SMART response SHALL apply §6, §7, §8, and later §9 validation as applicable. Unsigned raw FHIR JSON remains patient-mediated unless separate Artifact evidence, provenance, signature, authenticated retrieval evidence, or deployment policy establishes clinical-source trust.

#### 9.7.10 Failure handling before submission

A Phone presenter SHALL stop before Wallet invocation when pointer resolution, request retrieval, envelope opening, kiosk-wrapper validation, or embedded SMART request validation fails. A Phone presenter SHALL stop before response-submission success when same-device invocation is unavailable, cancelled, or fails before a valid SMART response is obtained through §8.

At a minimum, the Phone presenter SHALL fail safely for these categories:

- missing, empty, malformed, or unsupported Pointer URL fragment parameter `r`;
- provider not configured, provider unavailable, missing provider row, missing encrypted envelope, ambiguous lookup result, or malformed row;
- row, pointer, envelope, or signed-payload `requestId` mismatch;
- unsupported envelope version, unsupported envelope `alg`, unsupported `enc`, unsupported `contentType`, malformed envelope shape, invalid key id, invalid base64url field, or invalid ephemeral public key;
- expired request, unacceptable `createdAt`, unacceptable `createdAt`/`expiresAt` relationship, or other freshness-policy failure;
- request-opening private key unavailable, not associated with `recipientKeyId`, or not acceptable for this provider, audience, or deployment policy;
- request-envelope decryption failure, AES-GCM authentication failure, or plaintext UTF-8 decoding failure;
- invalid compact JWS syntax;
- unsupported JWS `alg`, wrong JWS `typ`, missing `kid`, unknown creator key, untrusted creator key, revoked or disabled creator key, or failed JWS signature;
- unacceptable `iss`, `aud`, `submitTo`, `encryptRequestTo`, `encryptResponseTo`, `constraints`, `minter`, key binding, algorithm label, or provider binding under deployment policy;
- missing, non-object, or invalid embedded `smartRequest`;
- unavailable Browser / User Agent, Credential Manager, Wallet, Digital Credentials API, privileged-caller mechanism, or deployment-approved same-device presentation surface;
- Holder cancellation before a Wallet response is produced; and
- Wallet invocation or §8 processing failure before a valid SMART response is available for later submission.

Failures in pointer resolution, envelope opening, wrapper validation, and embedded SMART request validation are wrapper or transport failures and prevent Wallet invocation. Holder refusal, unavailable content, unsupported request items, partial fulfillment, and item-level Wallet processing errors after a valid §8 request are SMART response outcomes under §6 when the Wallet/Responder constructs a valid SMART response. A Phone presenter SHOULD distinguish these categories in local state and diagnostics without exposing sensitive information.

Holder-facing error messages SHOULD be understandable and recoverable where possible, such as asking the Holder to rescan a current QR code, use a supported browser, or seek staff assistance. Error surfaces and logs SHOULD NOT expose private keys, raw ciphertext, decrypted JWS plaintext, clinical response content, stack traces, valid request-id enumeration clues, provider credentials, or sensitive relay diagnostics. This subsection does not define phone-to-desktop failure reporting, response submission, encrypted response format, completion notification, or desktop completion behavior.
