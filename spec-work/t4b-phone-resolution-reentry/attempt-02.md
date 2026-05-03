## 9.7 Phone resolution and re-entry into §8

This subsection defines the phone-side processing that begins when a Holder opens a Pointer URL produced under §9.6. The Phone presenter resolves the pointer, retrieves and opens the encrypted kiosk request, verifies the Kiosk creator's signed wrapper, validates the embedded SMART request, and then invokes the base same-device presentation flow defined in §8 on the phone.

The kiosk flow remains a wrapper around §8. The Pointer URL does not contain a §8 `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, Wallet response, SMART response, encrypted submission, or plaintext SMART request. Those §8 request artifacts are constructed by the Phone presenter only after the kiosk wrapper has been successfully resolved and validated.

Response submission after the phone obtains a SMART response is defined in §§9.8-9.12. This subsection mentions `encryptResponseTo` and response completion only as signed metadata and handoff context.

### 9.7.1 Processing overview

For the active pointer-only profile, a Phone presenter SHALL process the kiosk request in this order:

1. parse the Pointer URL fragment parameter `r` as the kiosk wrapper `requestId`;
2. fetch or otherwise read the provider request row or encrypted request envelope identified by that `requestId`;
3. require the pointer, provider request row when present, encrypted envelope, and decrypted signed payload to bind to the same kiosk wrapper `requestId`;
4. decrypt the `EncryptedKioskRequest` using request-opening private key material available to the Phone presenter or to the deployment profile;
5. verify the compact request JWS, including header, signature, creator key trust, issuer and audience policy, freshness bounds, provider binding, algorithm labels, constraints, and signed-payload shape;
6. validate `KioskRequestPayload.smartRequest` as a `SmartHealthCheckinRequest` under §5, preserving `smartRequest.id` as distinct from the kiosk wrapper `requestId`;
7. present appropriate phone UI context and invoke or re-enter the §8 same-device `org-iso-mdoc` flow using that validated `smartRequest`; and
8. after §8 returns, hand the resulting SMART response and signed kiosk metadata to the later submission processing defined in §§9.8-9.12.

A Phone presenter SHALL fail safely and SHALL NOT invoke the Wallet/Responder when required pointer resolution, envelope opening, wrapper verification, SMART request validation, or local same-device request construction fails.

### 9.7.2 Pointer parsing and provider lookup

A Phone presenter that supports the §9.6 active pointer format SHALL parse the URL fragment as form-style parameters and SHALL read fragment parameter `r` as the kiosk wrapper request identifier. If `r` is absent, empty, duplicated in a way the implementation cannot process unambiguously, or otherwise outside the Phone presenter's accepted identifier limits, the Phone presenter SHALL treat the request as missing a kiosk request pointer.

The Phone presenter SHALL use the parsed `r` value as an opaque lookup key. It SHALL NOT derive clinical request semantics, requester identity, Holder consent, origin trust, reader trust, or clinical-source provenance from the syntax or contents of `r`.

The Phone presenter, or a provider component acting on its behalf, SHALL fetch or read the provider request row or encrypted request envelope corresponding to the parsed `requestId`. For the active provider row shape, the request row contains:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

If the provider returns no row or no encrypted envelope for the parsed `requestId`, the Phone presenter SHALL treat the kiosk request as unavailable. A Submission service or relay MAY return a generic not-found, expired, unauthorized, or unavailable result to avoid exposing request enumeration details.

### 9.7.3 Request-id binding across pointer, row, envelope, and signed payload

The kiosk wrapper `requestId` is the binding value for the pointer and request envelope. It is distinct from the clinical `smartRequest.id` defined in §5.

Before invoking §8, the Phone presenter SHALL verify all available wrapper bindings by exact string equality:

- Pointer fragment `r` SHALL equal the provider request row `requestId` when a row field is present.
- Pointer fragment `r` SHALL equal `EncryptedKioskRequest.requestId`.
- `EncryptedKioskRequest.requestId` SHALL equal the decrypted and verified `KioskRequestPayload.requestId`.
- When a provider lookup uses a separate row id or routing key, provider policy SHALL bind that routing key to the same `requestId` or otherwise prevent one request id from returning an envelope for another.

If any required binding check fails, the Phone presenter SHALL reject the kiosk request and SHALL NOT continue to same-device presentation. A Submission service SHOULD also reject writes that attempt to publish an encrypted request under a row whose `requestId` differs from the signed payload and envelope values, but the Phone presenter SHALL still perform its own binding checks because the relay is not trusted.

A Phone presenter, Wallet/Responder, Verifier, or Requester SHALL NOT substitute the kiosk wrapper `requestId` for `smartRequest.id`, and SHALL NOT substitute `smartRequest.id` for the kiosk wrapper `requestId`. The SMART response created in §8 echoes `smartRequest.id` as `SmartHealthCheckinResponse.requestId` under §6; later kiosk submission and completion correlate relay state with the kiosk wrapper `requestId` under §§9.8-9.12.

### 9.7.4 Opening the encrypted request envelope

After obtaining the encrypted envelope, the Phone presenter SHALL parse `EncryptedKioskRequest` according to §9.5 and SHALL require the version, algorithm, encryption label, content type, key identifiers, IV, ciphertext, and ephemeral public key fields required by that section.

For this profile, the Phone presenter SHALL decrypt the envelope using the request-envelope suite defined in §9.3:

- recipient private key corresponding to `EncryptedKioskRequest.recipientKeyId` and to `KioskRequestPayload.encryptRequestTo.keyId`;
- sender ephemeral P-256 public key from `EncryptedKioskRequest.ephemeralPublicKeyJwk`;
- HKDF-SHA-256 salt `utf8(requestId)`;
- HKDF info `utf8("smart-health-checkin-kiosk-request-v1")`;
- AES-256-GCM with IV from `EncryptedKioskRequest.iv`; and
- AES-GCM additional authenticated data `utf8(requestId)`.

The plaintext SHALL be a compact kiosk request JWS encoded as UTF-8 text. A Phone presenter SHALL reject the request if envelope parsing fails, the declared algorithm labels are unsupported or inconsistent with this profile, key import fails, AES-GCM authentication fails, the plaintext is not a compact JWS, or the envelope is expired before opening.

Request-opening private key material is deployment-specific. In a deployable untrusted-relay model, a Submission service is not trusted with plaintext clinical requests and does not need request-opening private keys. A deployment profile that delivers request-opening private key material to the Phone presenter SHALL protect that material according to its threat model. Checked-in browser-delivered demo private keys are demonstration behavior only and are not a production key-management pattern.

### 9.7.5 Compact JWS verification and signed-payload validation

After decryption, the Phone presenter SHALL verify the compact kiosk request JWS before using any signed payload content. The Phone presenter SHALL:

1. parse the compact JWS into exactly three non-empty base64url parts;
2. parse the protected header as JSON;
3. require `alg` to be exactly `ES256`;
4. require `typ` to be exactly `smart-health-checkin+kiosk-request+jws`;
5. require a non-empty `kid`;
6. resolve `kid` to a trusted creator public key under deployment policy;
7. verify the ES256 signature over the compact JWS signing input;
8. parse the payload as a `KioskRequestPayload`;
9. require `v` to be `1`;
10. evaluate `iss` and `aud` under deployment policy;
11. require `createdAt` and `expiresAt` to be numeric millisecond Unix timestamps, require `expiresAt` to be later than `createdAt`, reject expired requests, and reject requests whose `createdAt` is unacceptably far in the future under local clock-skew policy;
12. require `submitTo` to identify the provider context the Phone presenter is actually using, including the active `submitTo.backend` and provider application id or equivalent routing binding;
13. require `encryptRequestTo.alg` and `encryptResponseTo.alg` to be `ECDH-P256+HKDF-SHA256+AES-GCM` for this profile;
14. require `EncryptedKioskRequest.recipientKeyId` to match `KioskRequestPayload.encryptRequestTo.keyId`;
15. require `EncryptedKioskRequest.creatorKeyId`, protected-header `kid`, and `KioskRequestPayload.minter.keyId` to match or be accepted as equivalent by explicit deployment key policy; and
16. enforce signed constraints that affect phone processing, including rejecting `constraints.maxPlaintextBytes` values above the Phone presenter's supported limit.

A Phone presenter SHALL reject the request if the JWS is malformed, the signature is invalid, the creator key is untrusted, the issuer or audience is unacceptable, the request is expired or outside accepted freshness bounds, the provider binding does not match the provider used for lookup, algorithm labels are unsupported or inconsistent, or signed constraints are unacceptable.

A Kiosk creator SHOULD choose `iss`, `aud`, `kid`, `minter.keyId`, and key lifetimes so that a Phone presenter can make these decisions without contacting the untrusted relay for plaintext trust decisions. A deployment profile MAY define creator-key rotation, issuer/audience registries, certificate or JWK-set distribution, revocation, and allowable clock skew.

### 9.7.6 Embedded SMART request validation

`KioskRequestPayload.smartRequest` is the complete SMART request object carried by the kiosk wrapper. After JWS verification and wrapper binding, the Phone presenter SHALL validate `smartRequest` under §5 before constructing the same-device request.

The Phone presenter SHALL require `smartRequest` to be a JSON object that satisfies the `SmartHealthCheckinRequest` rules, including:

- `type` exactly `smart-health-checkin-request`;
- `version` exactly `1`;
- a non-empty clinical request `id`;
- valid optional `purpose` and `fhirVersions[]` members;
- `items[]` encoded as request items with unique item `id` values;
- valid item display fields, `required` flags, content selectors, and non-empty `accept[]` arrays; and
- the §5 rules for `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, questionnaire selectors, extension selectors, unknown members, and prohibited requester-identity metadata.

A Phone presenter SHALL keep `smartRequest.id` distinct from `KioskRequestPayload.requestId` in UI, logs, validation, same-device request construction, and later handoff state. The former is the clinical request id that the Wallet/Responder answers under §6; the latter is kiosk wrapper routing and correlation metadata.

A Phone presenter SHALL reject the kiosk request and SHALL NOT invoke the Wallet/Responder when the embedded SMART request is absent, not a JSON object, invalid under §5, or replaced by a preset id, request-profile wrapper, broad shortcut label, SDK helper object, `DeviceRequest`, `encryptionInfo`, or other non-SMART-request object.

### 9.7.7 Phone UI context and trust boundaries

After wrapper validation and before invoking the Wallet/Responder, the Phone presenter SHOULD display enough context for the Holder to understand that a kiosk check-in request is ready to be opened in the Holder's Wallet. The Phone presenter MAY display Holder-facing SMART request fields such as `purpose`, item `title`, item `summary`, selector summaries, expiration time, and the phone page's authenticated origin or app context when available.

The Phone presenter SHALL distinguish authenticated or policy-derived context from self-asserted SMART request display fields. Successful kiosk wrapper validation authenticates the wrapper creator under deployment policy and protects the embedded SMART request against relay tampering. It does not by itself make `purpose`, item display text, selector values, provider application ids, relay URLs, or pointer metadata authenticated requester identity. It also does not create clinical-source provenance for Artifacts that may later be returned by a Wallet/Responder.

A Wallet/Responder that is invoked through the re-entered §8 flow SHALL apply the trust and display rules of §§5, 7, and 8. In particular, it SHALL NOT treat SMART request body fields as authenticated requester identity merely because the kiosk wrapper verified, and it SHALL NOT treat kiosk wrapper validation as issuer trust, device trust, clinical-source provenance, Holder consent, patient matching, or downstream authorization.

### 9.7.8 Re-entry into the same-device `org-iso-mdoc` flow

Once the Phone presenter has accepted the kiosk wrapper and validated `smartRequest`, it SHALL construct a new §8 same-device presentation request on the phone using that `smartRequest`. The Phone presenter acts as the §8 Verifier for this local invocation unless a deployment profile explicitly separates the phone UI from the Verifier authority.

The Phone presenter SHALL follow §8 request-construction rules, including:

- serializing the validated `smartRequest` as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
- requesting `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`;
- constructing `DeviceRequest` version `1.0` with tag-24-wrapped `ItemsRequest`;
- generating or selecting the §8 HPKE recipient key pair and `encryptionInfo` for this phone-local presentation session;
- constructing the §8 `SessionTranscript` from the exact `encryptionInfo` base64url string and the authenticated origin or deployment-approved origin-equivalent context for the phone invocation; and
- invoking the W3C Digital Credentials API or equivalent deployment mechanism using protocol `org-iso-mdoc`.

The Phone presenter SHALL NOT use a `DeviceRequest`, `encryptionInfo`, HPKE recipient key, `SessionTranscript`, Wallet response, or `dcapiResponse` from the Pointer URL or encrypted kiosk request unless a future profile explicitly defines such a different binding. The active version 1.0 kiosk wrapper carries only the SMART request inside the signed payload; the §8 presentation request is constructed after validation on the phone.

The Wallet/Responder then processes the request under §8.4, performs Holder review, constructs the SMART response under §6 and §8.5, and returns the encrypted mdoc response to the Phone presenter under §8.6. The Phone presenter validates and opens that same-device response under §8.7 and §8.8 before handing the resulting SMART response to the later kiosk submission step.

### 9.7.9 Failure handling

A Phone presenter SHALL fail safely on request-resolution and re-entry errors. It SHALL NOT invoke the Wallet/Responder, submit a response, or mark the kiosk session complete when it has not accepted a validated kiosk request and constructed a valid §8 request.

At a high level, a Phone presenter SHALL handle these conditions as failures before same-device invocation:

| Condition | Required phone behavior |
| --- | --- |
| Missing or invalid pointer `r` | Report that no kiosk request pointer is available; do not fetch arbitrary request state. |
| Provider row or encrypted envelope not found | Report that the kiosk request is unavailable, expired, or no longer active; do not infer clinical content. |
| Expired or not-yet-valid request | Reject before Wallet invocation, subject to deployment clock-skew policy. |
| Envelope parse, algorithm, key, or decrypt failure | Reject as an unopened or tampered kiosk request. |
| Untrusted creator key, unacceptable `iss`/`aud`, bad `typ`, bad `alg`, or invalid JWS signature | Reject as an untrusted or invalid kiosk request. |
| Pointer, row, envelope, or signed-payload `requestId` mismatch | Reject as a binding failure. |
| Provider `submitTo` mismatch | Reject as a request minted for a different provider context. |
| Invalid embedded `smartRequest` | Reject as an invalid clinical request and do not substitute presets or fallback request objects. |
| Unavailable same-device Wallet invocation or unsupported `org-iso-mdoc` path | Report that the phone cannot open a compatible Wallet from this context; do not submit completion state. |

Failure displays SHOULD avoid revealing unnecessary clinical details or trust-policy internals. A Submission service MAY record coarse failure or cleanup state, but a conforming deployment SHALL NOT require the untrusted relay to learn plaintext SMART request content, Wallet decisions, SMART responses, or raw clinical Artifacts in order to report these failures.

### 9.7.10 Handoff to response submission

If §8 completes successfully and the Phone presenter obtains and validates a SMART response, the Phone presenter proceeds to the submission and completion processing defined in §§9.8-9.12. That later processing uses the signed kiosk metadata, including the wrapper `requestId`, `submitTo`, `encryptResponseTo`, and `constraints`, to encrypt and route the result for the Completion display.

This subsection does not define the response-submission plaintext shape, response encryption operation, storage row, blob format, completion-display decryption, replay handling, or final rendering rules. Those rules belong to T4.C.

## Conformance inventory for §9.7

| Target | Requirement | Section |
| --- | --- | --- |
| Phone presenter | SHALL parse fragment parameter `r` as the pointer `requestId` for the active pointer format. | §9.7.2 |
| Phone presenter | SHALL fetch/read the provider row or encrypted envelope by the parsed `requestId`. | §9.7.2 |
| Phone presenter | SHALL bind pointer, row when present, envelope, and signed payload `requestId` by exact equality. | §9.7.3 |
| Phone presenter | SHALL keep kiosk wrapper `requestId` distinct from `smartRequest.id`. | §§9.7.3, 9.7.6 |
| Phone presenter | SHALL parse and decrypt `EncryptedKioskRequest` with the §9.3 request-envelope suite. | §9.7.4 |
| Phone presenter | SHALL verify the compact request JWS header, signature, creator key trust, issuer/audience policy, freshness, provider binding, algorithm labels, and constraints. | §9.7.5 |
| Phone presenter | SHALL validate `KioskRequestPayload.smartRequest` under §5 before same-device invocation. | §9.7.6 |
| Phone presenter | SHALL reject presets, wrappers, `DeviceRequest`, `encryptionInfo`, or other substitutes for direct `smartRequest`. | §9.7.6 |
| Phone presenter | SHALL distinguish wrapper trust from authenticated requester identity and clinical-source provenance. | §9.7.7 |
| Wallet/Responder | SHALL NOT treat SMART request display fields as authenticated requester identity merely because the kiosk wrapper verified. | §9.7.7 |
| Phone presenter | SHALL construct a fresh §8 same-device request on the phone after kiosk validation. | §9.7.8 |
| Phone presenter | SHALL NOT use §8 `DeviceRequest` or `encryptionInfo` from the Pointer URL or encrypted kiosk request in the active v1.0 profile. | §9.7.8 |
| Phone presenter | SHALL fail safely and not invoke Wallet or submit completion when required validation fails. | §9.7.9 |
| Submission service / relay | MAY return generic not-found/expired/unavailable errors and MAY record coarse failure/cleanup state without plaintext access. | §§9.7.2, 9.7.9 |
| Kiosk creator | SHOULD choose trust and key identifiers so Phone presenters can evaluate creator trust without relying on relay plaintext access. | §9.7.5 |

## Organizer notes

### Strengths

- Preserves the accepted T4.A model: pointer-only `#r=<requestId>`, direct signed `smartRequest`, opaque relay, and distinct kiosk wrapper versus clinical identifiers.
- Makes the phone sequence explicit and aligns it with active code paths: `kioskRequestPointerFromLocationHash`, provider `readRequest`, `openEncryptedKioskRequest`, `verifyKioskRequestJws`, `validateSmartCheckinRequest`, and `SmartCheckinButton`/§8 re-entry.
- States that §8 `DeviceRequest` and `encryptionInfo` are built on the phone after validation, rejecting the stale inline `KioskSessionDescriptor` pattern.
- Keeps T4.C out of scope except for handoff context.

### Caveats

- Active demo naming still calls the request-opening key a “submission service” key and ships demo private key material to browser code. The draft states the deployable untrusted-relay requirement and treats demo key custody as non-production.
- Active code hard-codes demo `iss`/`aud` constants; the draft requires deployment-policy validation without standardizing those strings.
- Active code validates `EncryptedKioskRequest.expiresAt` and signed `expiresAt`, but it does not independently require every envelope timestamp/key-id equality that the draft recommends or requires. Canonical T4.B should decide whether to make all such cross-field checks mandatory or leave some to T4.D/conformance profiles.

### Open issues

- Define exact clock-skew windows, maximum kiosk lifetime, request-id length/entropy requirements, and provider error taxonomy in conformance/security closure.
- Decide whether `creatorKeyId`, protected-header `kid`, and `minter.keyId` must always be exact matches or may be equivalent under registered key policy.
- Decide whether request-opening private key delivery to the Phone presenter needs a named conformance class or remains deployment-profile material.
- Align Appendix B/C/D schemas and fixtures with this phone-side validation checklist.

### Downstream dependencies

- T4.C must define response-submission plaintext, encryption to `encryptResponseTo.desktopPublicKeyJwk`, enforcement of `constraints.maxPlaintextBytes`, submission rows/blobs, replay handling, and Completion display processing.
- T4.D must encode CDDL/schema and fixtures for pointer-to-row-to-envelope-to-JWS binding and failure cases.
- §11 and §12 should cover QR substitution, pointer guessing, relay metadata leakage, demo key material, UI redress, and privacy-preserving failure reporting.
- §13/T5 should settle registries for JWS `typ`, content type, algorithm labels, key identifiers, issuer/audience policy, and conformance checklist rows.
