### 9.7 Phone resolution and re-entry into §8

This subsection defines the phone-side processing that starts when a Holder opens a Pointer URL from the cross-device kiosk flow. The Phone presenter resolves the pointer, retrieves the encrypted kiosk request state, opens and verifies the kiosk wrapper, validates the embedded SMART request, and then re-enters the same-device `org-iso-mdoc` flow defined in §8 on the phone.

The kiosk request wrapper is not a second clinical presentation protocol. The Pointer URL does not contain the §8 `DeviceRequest`, §8 `encryptionInfo`, a SMART response, or response-submission material. The §8 request construction happens on the phone only after the kiosk wrapper and the embedded `smartRequest` have been validated.

Response submission and Completion display processing after the phone obtains a SMART response are defined in §§9.8-9.12. This subsection mentions `encryptResponseTo` and submission metadata only as signed context that is preserved for those later steps.

#### 9.7.1 Parse the Pointer URL

For the active pointer format defined in §9.6, a Phone presenter SHALL parse the URL fragment as form-style parameters and SHALL require fragment parameter `r` to be present and non-empty. The value of `r` is the kiosk wrapper request identifier, here called `pointerRequestId`.

A Phone presenter SHALL treat `pointerRequestId` as a bearer locator for encrypted request state. It SHALL NOT treat possession of the Pointer URL as Holder consent, requester authentication, clinical-source provenance, or authorization to disclose clinical content.

A Phone presenter SHALL NOT look for the plaintext `smartRequest`, compact request JWS, `EncryptedKioskRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, `DeviceResponse`, SMART response, or response-submission ciphertext in the Pointer URL for this profile. A Pointer URL that uses the legacy inline same-device descriptor shape with `deviceRequest` or `encryptionInfo` fragment parameters is not the active §9.6 pointer format.

#### 9.7.2 Retrieve the encrypted kiosk request

The Phone presenter SHALL use `pointerRequestId` and the configured provider or deployment routing information to fetch or read the provider request row or equivalent encrypted request envelope. For the active provider row shape, the row contains a row-level `requestId` and an `encryptedRequest` object. Other providers MAY expose an equivalent lookup result, provided the Phone presenter can still apply the binding checks in this subsection.

A Submission service or relay MAY reject unknown, expired, unauthorized, rate-limited, malformed, or policy-disallowed reads before returning an envelope. Such relay checks are defense in depth. A Phone presenter SHALL NOT rely on relay access control or row existence as a substitute for request-envelope decryption, JWS verification, creator trust, expiration checks, SMART request validation, or same-device §8 processing.

If no request state is found for `pointerRequestId`, the Phone presenter SHALL fail safely before invoking the Wallet/Responder. It SHOULD present a generic expired-or-unavailable message to the Holder and SHOULD avoid displaying sensitive details that would help enumerate valid request ids.

#### 9.7.3 Validate the encrypted request envelope before opening

Before attempting decryption, the Phone presenter SHALL require the encrypted request envelope to have the version and algorithm labels defined in §9.5 for this profile:

- `v` equal to `1`;
- `alg` equal to `ECDH-P256+HKDF-SHA256+AES-GCM`;
- `enc` equal to `A256GCM`; and
- `contentType` equal to `application/smart-health-checkin-kiosk-request+jws+aesgcm`.

The Phone presenter SHALL require the envelope to include non-empty `requestId`, `createdAt`, `expiresAt`, `creatorKeyId`, `recipientKeyId`, `iv`, `ciphertext`, and `ephemeralPublicKeyJwk` values of the expected types. It SHALL require the envelope `requestId` to equal `pointerRequestId`. If the provider returns a row-level or lookup-level request id, the Phone presenter SHALL also require that value to equal both `pointerRequestId` and `encryptedRequest.requestId`.

The Phone presenter SHALL reject an envelope whose `expiresAt` is not later than the current validation time. The Phone presenter SHALL reject an envelope whose `createdAt` is in the future beyond deployment clock-skew policy, or whose `createdAt` / `expiresAt` relationship violates §9.4 freshness policy. A deployment profile SHOULD define the accepted clock-skew window; the active implementation uses a small future skew tolerance.

The Phone presenter SHALL verify that the request-opening private key material available to it, or to the deployment component acting on its behalf, corresponds to the envelope `recipientKeyId` and to a request-opening key accepted for this provider and audience. A deployment that treats the Submission service as untrusted SHALL NOT require the untrusted relay itself to possess this private key material.

#### 9.7.4 Decrypt the `EncryptedKioskRequest`

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

The Phone presenter SHALL reject the request if base64url decoding fails, key import fails, key agreement fails, AES-GCM authentication fails, the plaintext is not UTF-8 text, or the plaintext is not a compact JWS with exactly three non-empty segments. Decryption failure is a protocol failure for this kiosk request and the Phone presenter SHALL NOT invoke the Wallet/Responder with any request derived from failed ciphertext.

#### 9.7.5 Verify the compact kiosk request JWS

After decryption, the Phone presenter SHALL verify the compact JWS before using its payload. The Phone presenter SHALL parse the protected header and SHALL require:

- `alg` equal to `ES256`;
- `typ` equal to `smart-health-checkin+kiosk-request+jws`; and
- a non-empty `kid`.

The Phone presenter SHALL resolve `kid` to a creator public key that is trusted under deployment policy for this kiosk wrapper, provider, audience, and use. If no acceptable creator public key is found, the Phone presenter SHALL reject the kiosk request as untrusted. The Phone presenter SHALL verify the ES256 signature over the compact JWS signing input. It SHALL reject the request if the signature is malformed, uses an unsupported algorithm, does not verify, or verifies only under a key that is not trusted for this use.

The Phone presenter SHALL parse the JWS payload as a `KioskRequestPayload` and SHALL validate at least these signed fields before same-device re-entry:

1. `v` is `1`.
2. `iss` is accepted by deployment creator-trust policy.
3. `aud` is accepted for the request-opening or provider trust context.
4. payload `requestId` equals `pointerRequestId`, the provider row or lookup id when present, and envelope `requestId`.
5. payload `createdAt` and `expiresAt` pass the same freshness, expiration, and clock-skew policy applied to the envelope, and payload times match or are consistent with the corresponding envelope times required by §9.5.
6. `submitTo` identifies the provider through which this request was retrieved. For the active InstantDB shape, `submitTo.backend` is `"instantdb"` and `submitTo.appId` equals the configured provider application id.
7. `encryptRequestTo.alg` is `ECDH-P256+HKDF-SHA256+AES-GCM`, and `encryptRequestTo.keyId` matches or is consistent with envelope `recipientKeyId` and the request-opening key under deployment policy.
8. `encryptResponseTo.alg` is the supported response-submission algorithm label. The Phone presenter SHALL preserve the remaining `encryptResponseTo` metadata for later §9.8 processing but SHALL NOT treat it as same-device §8 encryption metadata.
9. `constraints` is present and any supported constraint values are within implementation and deployment limits. For the active field, `constraints.maxPlaintextBytes` is later enforced by §9.8; the Phone presenter SHOULD reject a wrapper that advertises a value above its implementation maximum.
10. `minter.keyId` is present and is equal to, or otherwise policy-consistent with, the protected-header `kid`.

The Phone presenter SHALL reject the kiosk request on any request-id mismatch among pointer, row or lookup result, envelope, and signed payload. This binding prevents ciphertext swapping, stale-row confusion, and accidental pairing of the phone with a different kiosk session.

#### 9.7.6 Validate and retain the embedded SMART request

The Phone presenter SHALL require `KioskRequestPayload.smartRequest` to be a JSON object that validates as a `SmartHealthCheckinRequest` under §5. The `smartRequest` member is the complete clinical request. The Phone presenter SHALL NOT accept a kiosk payload that replaces `smartRequest` with `request`, `requestProfile`, `preset`, `presetId`, `ips`, an “all of the above” shortcut, a demo profile label, an SDK helper object, or any other wrapper in place of the §5 SMART request.

The Phone presenter SHALL keep the kiosk wrapper `requestId` distinct from `smartRequest.id`. The wrapper `requestId` is used for pointer lookup, envelope/JWS binding, and later kiosk-session correlation. The `smartRequest.id` is the clinical request identifier that the Wallet/Responder uses when constructing `SmartHealthCheckinResponse.requestId` under §6. A Phone presenter SHALL NOT rewrite `smartRequest.id` to equal the kiosk wrapper `requestId` and SHALL NOT use the kiosk wrapper `requestId` as the §6 response `requestId`.

A Phone presenter MAY display Holder-facing context from the embedded SMART request, such as `purpose`, item `title`, item `summary`, `required`, and requested content categories, after validation. If it displays such text, it SHALL distinguish unauthenticated clinical request display text from authenticated origin, creator, reader, or deployment-trust information. Kiosk wrapper validation does not turn `purpose`, item text, selector URLs, provider ids, row ids, or key ids into authenticated requester identity.

#### 9.7.7 Re-enter the same-device `org-iso-mdoc` flow

After successful wrapper validation and SMART request validation, the Phone presenter SHALL invoke or participate in the same-device presentation flow defined in §8 using the validated `smartRequest` as the original SMART request for that phone-local flow.

For the core version 1.0 profile, the Phone presenter or its Verifier component SHALL construct a fresh §8 request on the phone. In particular, it SHALL:

1. serialize the validated `smartRequest` as the SMART request JSON carried only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
2. construct an §8 `ItemsRequest`, tag-24 `DocRequest.itemsRequest`, `DeviceRequest` version `"1.0"`, optional `readerAuth`, and `encryptionInfo` according to §8.2;
3. use the direct `org-iso-mdoc` Digital Credentials API request shape from §8.2.6;
4. derive the §8 `SessionTranscript` from the exact phone-local `encryptionInfo` base64url string and the authenticated phone-local origin or deployment-approved origin-equivalent under §8.3; and
5. process the Wallet/Responder result under §8.7 and §8.8 before treating any SMART response as obtained for later kiosk submission.

The Phone presenter SHALL NOT reuse, import, or infer a §8 `DeviceRequest`, `encryptionInfo`, HPKE recipient key, `SessionTranscript`, `DeviceResponse`, or Wallet response from the QR code, Pointer URL, relay row, encrypted kiosk request envelope, or kiosk wrapper JWS. Those artifacts were not carried by the active pointer-only wrapper and are constructed for the phone-local same-device flow after validation.

The Wallet/Responder remains responsible for §8 Wallet-side validation, Holder review, Wallet policy, response construction under §6, mdoc response construction, and HPKE response encryption. The Phone presenter is not a substitute for the Wallet/Responder and scanning a Pointer URL is not Holder consent.

If same-device invocation is unavailable, unsupported by the phone browser or platform, blocked by Wallet policy, cancelled by the Holder, or fails §8 validation, the Phone presenter SHALL fail safely and SHALL NOT fabricate a SMART response. It MAY display local retry or support guidance and MAY report a coarse failure status to the kiosk session if a later §9 subsection or deployment profile defines such reporting.

#### 9.7.8 Trust-boundary preservation

A Phone presenter, Wallet/Responder, Verifier, Requester, Completion display, or downstream receiver SHALL preserve the trust-layer separation defined in §7. Successful kiosk wrapper decryption and creator-JWS verification prove only the wrapper properties validated under this subsection and deployment policy. They do not prove Holder consent, patient identity, Wallet authenticity, mdoc issuer trust, reader authentication for the §8 flow, clinical-source provenance, downstream EHR write-back authorization, or requester identity through display fields.

The Phone presenter SHALL NOT present SMART request display fields as authenticated requester identity merely because the kiosk wrapper verifies. A Wallet/Responder SHALL continue to apply §7 and §8 trust processing for the phone-local presentation. A Verifier, Requester, Completion display, or receiver that later consumes a SMART response SHALL apply §6, §7, §8, and later §9 submission/completion validation as applicable, without treating kiosk wrapper validity as clinical-source provenance. Unsigned raw FHIR JSON remains patient-mediated unless separate Artifact evidence or deployment policy establishes clinical-source trust under §7.4.

#### 9.7.9 Failure handling

A Phone presenter SHALL stop before Wallet invocation when pointer resolution, encrypted request opening, kiosk-wrapper validation, or embedded SMART request validation fails. At a minimum, the Phone presenter SHALL fail safely for these cases:

- missing or empty Pointer URL fragment parameter `r`;
- provider not configured or unavailable;
- no provider request row or envelope for `pointerRequestId`;
- malformed row, malformed envelope, unsupported envelope version, unsupported algorithm label, or unsupported content type;
- expired request, unacceptable `createdAt`, or unacceptable clock-skew condition;
- request-opening key unavailable or not acceptable for the envelope `recipientKeyId`;
- decryption, base64url decoding, UTF-8 decoding, or AES-GCM authentication failure;
- malformed compact JWS;
- unsupported JWS `alg` or wrong `typ`;
- missing `kid`, unknown creator key, untrusted creator key, or invalid JWS signature;
- unacceptable `iss`, `aud`, `submitTo`, key binding, algorithm, or constraint value under deployment policy;
- request-id mismatch between pointer, row or lookup result, envelope, and signed payload;
- missing or invalid embedded `smartRequest`; or
- unavailable, unsupported, cancelled, or failed same-device Wallet invocation.

The Phone presenter SHOULD present Holder-facing error text that is understandable but does not leak clinical content, private key material, raw ciphertext, stack traces, valid request-id enumeration clues, or sensitive provider metadata. A Submission service MAY record coarse status for operational support if a later §9 subsection or deployment profile defines such status, but this subsection does not define response submission, completion notification, encrypted response format, or desktop completion behavior.

## Organizer notes

Strengths:

- Keeps §9.7 narrowly scoped to phone resolution, wrapper verification, SMART request validation, and phone-local re-entry into the existing §8 `org-iso-mdoc` flow.
- Preserves the accepted T4.A pointer-only model: `#r=<requestId>` locates encrypted request state and does not carry plaintext clinical content or same-device §8 artifacts.
- Makes all request-id bindings explicit across pointer, provider row or lookup result, envelope, and signed payload, while preserving `smartRequest.id` as the separate §5/§6 clinical request id.
- Separates wrapper creator trust, §8 presentation trust, and clinical-source provenance, aligning with §7 and with the T4.A canonical trust-boundary text.

Caveats and open issues:

- Active demo code names the request-opening key as a “submission service” key and ships demo private key material in browser-delivered code. The draft states the deployable requirement that an untrusted relay not possess request-opening private key material; production key custody and packaging remain §11/§13/deployment-profile work.
- Active code validates demo `iss` and `aud` constants. The draft generalizes these to deployment policy, because permanent issuer/audience conventions are not yet registered.
- Active code validates `smartRequest` both inside `openEncryptedKioskRequest` and again in the submit page; the draft makes validation a Phone presenter requirement rather than prescribing this code layering.
- Failure status is intentionally high level. Specific relay status rows, phone-to-desktop failure notifications, replay/single-use behavior, and encrypted response submission belong to T4.C (§§9.8-9.12).

Downstream dependencies:

- T4.C must define the response-submission plaintext and ciphertext, use of signed `encryptResponseTo` metadata, size-limit enforcement, completion processing, replay controls, and provider abstraction.
- T4.D must align kiosk CDDL/schema/fixtures with the envelope/JWS validation order and binding checks here.
- §11 and §12 should revisit QR substitution, pointer guessing, metadata leakage, demo key custody, error-message leakage, and relay retention.
- §13 and conformance closure should decide whether clock-skew windows, creator-key registries, audience identifiers, provider identifiers, and exact constraint ceilings are core requirements or deployment-profile requirements.
