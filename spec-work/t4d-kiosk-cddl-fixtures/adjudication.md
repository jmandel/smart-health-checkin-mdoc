# T4.D adjudication: kiosk CDDL/schema and fixture material

## Inputs, scope, and dependency preservation

This adjudication covers the Appendix C kiosk pseudo-CDDL / JSON-shape material and Appendix D kiosk fixture-index material for the §9 kiosk wrapper. It does not reopen the accepted §5/§6 clinical model, §8 same-device flow, or §§9.1-9.12 kiosk flow. The dependency tree assigns T4.D to Appendix C portions for kiosk JWS / encrypted-request envelopes and Appendix D kiosk JWS round-trip vectors and fixture entries (`spec.md.outline.dependency_tree:315-326`; `spec.md.outline:449-450`).

Accepted dependencies control these decisions:

- Appendix C material must be profile pseudo-CDDL, not complete imported ISO/IEC 18013-5 CDDL or a replacement for normative prose (`spec-work/t3d-same-device-cddl-fixtures/canonical.md:1-8`; `spec-work/t3d-same-device-cddl-fixtures/orchestrator-review.md:30-34`).
- `KioskRequestPayload.smartRequest` directly embeds the §5 SMART request, and the wrapper `requestId` is distinct from `smartRequest.id` (`spec-work/t4a-kiosk-request-pointer/canonical.md:9-16`, `spec-work/t4a-kiosk-request-pointer/canonical.md:133-154`).
- The compact kiosk request JWS uses ES256, protected-header `kid`, and `typ: "smart-health-checkin+kiosk-request+jws"`; the active signing input uses recursively key-sorted JSON for the kiosk-wrapper JWS only (`spec-work/t4a-kiosk-request-pointer/canonical.md:38-76`).
- `EncryptedKioskRequest` uses `alg: "ECDH-P256+HKDF-SHA256+AES-GCM"`, `enc: "A256GCM"`, content type `application/smart-health-checkin-kiosk-request+jws+aesgcm`, wrapper timestamps, key ids, IV, ciphertext, and an ephemeral public JWK; request-envelope HKDF salt and AES-GCM AAD are `requestId`, and HKDF info is `smart-health-checkin-kiosk-request-v1` (`spec-work/t4a-kiosk-request-pointer/canonical.md:156-196`).
- The Pointer URL is only a fragment pointer `#r=<requestId>` and must not inline §8 `deviceRequest`, §8 `encryptionInfo`, a JWS, an encrypted request object, SMART request/response content, or submission material (`spec-work/t4a-kiosk-request-pointer/canonical.md:198-225`).
- Phone resolution binds the pointer, provider row, envelope, and signed payload wrapper `requestId`, validates the direct `smartRequest`, and constructs a fresh phone-local §8 request (`spec-work/t4b-phone-resolution-reentry/canonical.md:1-8`, `spec-work/t4b-phone-resolution-reentry/canonical.md:34-48`, `spec-work/t4b-phone-resolution-reentry/canonical.md:124-141`).
- Response submission uses `SubmissionPlaintext = { requestId, submittedAt, payload }`, with active successful `payload.kind = "smart-health-checkin-response"`, and encrypts to the signed desktop public key using P-256 ECDH + HKDF-SHA-256 + AES-256-GCM, salt/AAD wrapper `requestId`, info `smart-health-checkin-kiosk-response-v1`, fresh 96-bit IV, and a fresh phone ephemeral public JWK (`spec-work/t4c-submission-completion/canonical.md:7-43`, `spec-work/t4c-submission-completion/canonical.md:44-82`).
- Active provider abstraction and InstantDB row shapes are relay examples, not clinical trust evidence (`spec-work/t4c-submission-completion/canonical.md:83-124`, `spec-work/t4c-submission-completion/canonical.md:165-207`).

## Active implementation and documentation evidence checked

- Active kiosk TypeScript types define `KioskRequestJwsHeader`, `KioskRequestPayload`, `EncryptedKioskRequest`, `SubmissionPlaintext`, and `EncryptedPayload` with the field names used below (`rp-web/src/kiosk/protocol.ts:14-83`).
- Active constants define payload/blob size limits, blob content type, request content type, request/response HKDF info strings, JWS `typ`, and demo issuer/audience strings (`rp-web/src/kiosk/protocol.ts:3-12`).
- `createKioskRequestJws` creates a 32-random-byte base64url wrapper `requestId`, signs direct `smartRequest`, `submitTo`, `encryptRequestTo`, `encryptResponseTo`, `constraints.maxPlaintextBytes`, and `minter.keyId` (`rp-web/src/kiosk/protocol.ts:138-187`).
- `signCompactJws` encodes the protected header and payload as base64url over deterministic recursively sorted JSON and signs `encodedHeader.encodedPayload` with ES256 (`rp-web/src/kiosk/protocol.ts:387-400`, `rp-web/src/kiosk/protocol.ts:556-570`).
- `encryptKioskRequestJws` encrypts the compact JWS with fresh P-256 ECDH, HKDF salt/AAD `requestId`, request info string, 12-byte IV, and base64url `iv`/`ciphertext` fields (`rp-web/src/kiosk/protocol.ts:189-230`).
- `openEncryptedKioskRequest` validates the envelope, rejects expired requests, decrypts using the envelope `requestId` as salt/AAD, verifies the JWS, and rejects envelope/payload `requestId` mismatch (`rp-web/src/kiosk/protocol.ts:232-268`).
- Active payload validation checks version, demo issuer/audience, InstantDB provider app id, expiration, future `createdAt`, maximum constraint ceiling, algorithm labels, non-empty `minter.keyId`, and embedded SMART request validity; it does not fully validate every desirable schema constraint such as base64url syntax or JWK members itself (`rp-web/src/kiosk/protocol.ts:403-428`, `rp-web/src/kiosk/protocol.ts:472-517`).
- Pointer construction/parsing uses only `#r=` (`rp-web/src/kiosk/protocol.ts:370-380`; `rp-web/src/kiosk/kiosk-provider.ts:208-212`). The older `rp-web/src/sdk/kiosk-session.ts` still inlines `deviceRequest` and `encryptionInfo` in a fragment and is stale/non-canonical (`rp-web/src/sdk/kiosk-session.ts:12-23`, `rp-web/src/sdk/kiosk-session.ts:55-80`; see also `spec-work/t4b-phone-resolution-reentry/adjudication.md:64-71`).
- Provider abstractions and active rows match request row `{ requestId, encryptedRequest }` and submission row `{ submissionId, requestId, storagePath, storageFileId, iv, phoneEphemeralPublicKeyJwk }` (`rp-web/src/kiosk/kiosk-provider.ts:26-65`, `rp-web/src/kiosk/instant-mailbox.ts:13-31`, `rp-web/src/kiosk/instant-mailbox.ts:49-117`, `rp-web/src/instant/schema.ts:10-21`).
- Submission encryption/decryption uses deterministic key-sorted JSON, signed plaintext limit, fresh phone P-256 key, signed desktop public JWK, salt/AAD wrapper `requestId`, response info string, 12-byte IV, and an opaque ciphertext `Uint8Array` (`rp-web/src/kiosk/protocol.ts:306-367`).
- Active submit UI builds the successful payload as `{ kind: "smart-health-checkin-response", smartResponse }` only after same-device validation reports a valid SMART response (`rp-web/src/kiosk/submit-main.tsx:269-279`).
- Active provider test verifies pointer-only URL, no plaintext clinical strings in URL or encrypted request row, direct `smartRequest`, active payload kind, no `dcapiResponse`/`deviceResponse` in the submitted payload, and wrapper `requestId` binding (`rp-web/src/kiosk/kiosk-provider.test.ts:54-108`).
- Demo keys are intentionally checked in and explicitly not production key material (`rp-web/src/kiosk/demo-keys.ts:3-9`).
- Documentation confirms same-device fixture roots and active direct-mdoc carriers (`docs/PROTOCOL-EXPLAINER.md:281-317`, `docs/profiles/org-iso-mdoc.md:280-296`) and notes that kiosk response size policy is transport/deployment-specific (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:1164-1173`).
- `fixtures/README.md` defines fixture rules and lists current roots; no `fixtures/kiosk/` files are tracked (`fixtures/README.md:1-20`; `git ls-files 'fixtures/kiosk/**'`).
- Checked-in real Chrome/Android fixtures exist under `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` and `fixtures/responses/real-chrome-android-smart-checkin/`, with metadata marking demo/non-PHI real-platform same-device request/response captures (`fixtures/dcapi-requests/real-chrome-android-smart-checkin/metadata.json:1-48`; `fixtures/responses/real-chrome-android-smart-checkin/metadata.json:1-42`).
- Generated same-device request fixtures and Android test vectors are same-device/material regression roots, not kiosk-wrapper vectors (`rp-web/scripts/generate-dcapi-request-fixtures.ts:12-17`, `rp-web/scripts/generate-dcapi-request-fixtures.ts:111-139`, `rp-web/scripts/generate-dcapi-request-fixtures.ts:141-192`; `wallet-android/app/src/test/resources/gen-test-vectors.ts:1-16`, `wallet-android/app/src/test/resources/test-vectors.json:1-57`).

## Five-attempt synthesis

### Agreements

All five attempts agreed that Appendix C should describe kiosk wrapper JSON shapes and value constraints as profile pseudo-CDDL / schema guidance, not complete JOSE, JWK, ISO, JSON Schema, or InstantDB schemas. They also agreed on the central field set: direct `smartRequest`, compact ES256 request JWS, `EncryptedKioskRequest`, pointer-only `#r=<requestId>`, `SubmissionPlaintext`, response-submission encryption metadata, slim request/submission provider rows, base64url fields, timestamp numbers, and wrapper/SMART request id separation.

All five attempts also agreed that checked-in fixtures are mostly same-device or diagnostic material. None found a checked-in deterministic kiosk fixture root equivalent to a future `fixtures/kiosk/` suite. They recommended future vectors for deterministic JWS input, encrypted request envelope, pointer parsing, phone resolution, response submission, wrong AAD/request-id failures, expiration, size limits, malformed rows/JWK/IVs, duplicate rows, and plaintext-leakage checks.

### Disagreements and how they were resolved

- **Fixture promotion.** Some attempts sounded more willing to cite real Chrome/Android captures as current examples; others kept them historical. The adjudication keeps them diagnostic/historical for kiosk purposes because they exercise §8 same-device request/response, not the §9 kiosk wrapper, and because the dependency tree explicitly defers capture refresh decisions until T4/T6.C stabilization (`spec.md.outline.dependency_tree:322-326`, `spec.md.outline.dependency_tree:452-460`).
- **Provider schema exactness.** Attempts varied between full InstantDB schema and provider abstraction. The canonical lists only logical provider row abstractions plus active InstantDB example fields; it does not define a complete InstantDB schema.
- **Envelope metadata strictness.** Attempts differed on whether mirrored timestamps/key ids are core failure vectors. T4.A says creators set envelope mirrors from signed/header values; T4.B makes id binding mandatory and leaves some exact mirrored metadata treatment to T4.D/profile closure. The canonical preserves mandatory wrapper `requestId` binding, requires Kiosk creators to set mirrored metadata consistently, and recommends stricter conformance/profile rejection for non-id mirrored metadata mismatches while noting active code is looser for some non-id mirrors.
- **JWK constraints.** Attempts ranged from loose `JsonWebKey` placeholders to detailed public-key constraints. The canonical uses a constrained `JsonWebKey` placeholder for P-256 public keys (`kty`, `crv`, `x`, `y`, no private `d`) without attempting a complete JWK schema.
- **Byte vectors.** Attempts proposed future paths and byte vector names. The canonical does not invent checked-in paths or byte strings; it names a recommended future `fixtures/kiosk/` root only as a future fixture suite.
- **Production key management and trust.** Attempts generally warned against overclaiming from demo keys. The canonical explicitly rejects demo-key production claims and provider-row clinical trust claims.

## Accepted decisions

1. Appendix C kiosk material is JSON-shape/pseudo-CDDL guidance for the §9 wrapper. It imports `SmartCheckinRequest`, `SmartHealthCheckinResponse`, `JsonWebKey`, and compact JWS as placeholders and does not define complete JOSE/JWK/InstantDB/ISO schemas.
2. The request JWS protected header for this profile contains `alg: "ES256"`, non-empty `kid`, and `typ: "smart-health-checkin+kiosk-request+jws"`. Its signing input uses unpadded base64url over deterministic recursively key-sorted JSON for the protected header and payload.
3. `KioskRequestPayload.smartRequest` is the direct §5 SMART request object. No `requestProfile`, preset, IPS shortcut, “all of the above,” SDK helper wrapper, or inline §8 object belongs there.
4. Wrapper `requestId` is high entropy, base64url-compatible in the active implementation, and distinct from `smartRequest.id`. Provider rows, envelopes, signed payloads, AES-GCM AAD/HKDF salt, and submissions bind to wrapper `requestId`; SMART responses bind to `smartRequest.id`.
5. `EncryptedKioskRequest` plaintext is the compact kiosk request JWS, not unsigned JSON and not raw `smartRequest`. It uses request-envelope info `smart-health-checkin-kiosk-request-v1`.
6. Pointer URLs for the active profile carry only fragment parameter `r=<requestId>` and no inline §8 `deviceRequest`/`encryptionInfo`, JWS, encrypted envelope, request/response body, ciphertext, or keys.
7. `SubmissionPlaintext` is `{ requestId, submittedAt, payload }`. The active successful payload is `{ kind: "smart-health-checkin-response", smartResponse }`; top-level `requestId` is the wrapper id, while inner `smartResponse.requestId` is `smartRequest.id`.
8. Response-submission crypto is distinct from request-envelope crypto and §8 HPKE. It uses response-submission info `smart-health-checkin-kiosk-response-v1`, wrapper `requestId` as HKDF salt and AES-GCM AAD, a fresh phone ephemeral P-256 key, and an opaque `application/octet-stream` ciphertext blob.
9. Active request rows are abstractly `{ requestId, encryptedRequest }`. Active submission rows include `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`. These are routing/decryption metadata only.
10. Checked-in same-device fixtures remain useful for §8 and for kiosk re-entry prerequisites, but they are not current kiosk-wrapper conformance vectors.

## Rejected or unsupported claims

- No checked-in `fixtures/kiosk/` byte-vector suite exists today; any claim of current deterministic kiosk JWS/envelope/submission vectors is unsupported.
- Existing Chrome/Android captures are not current kiosk-wrapper normative examples. They may be paired diagnostic/historical same-device captures, but they do not exercise §9 request JWS, encrypted request envelope, pointer resolution, or response-submission encryption.
- The legacy `rp-web/src/sdk/kiosk-session.ts` fragment that inlines §8 `deviceRequest` and `encryptionInfo` is not the active kiosk pointer profile.
- Provider rows, InstantDB permission results, storage paths, upload/download events, row order, or provider app ids are not Holder consent, patient identity, requester identity, mdoc issuer/device trust, clinical-source provenance, SMART response validity, or downstream authorization.
- Demo issuer/audience strings and checked-in demo keys are not production registries, trust anchors, or key-management guidance.
- A request-profile wrapper, preset, IPS shortcut, “all of the above” selector, inline §8 `deviceRequest`/`encryptionInfo` in QR/pointer, or response payload containing raw `dcapiResponse`/`deviceResponse` is rejected for this canonical profile.
- A required provider-row SHA-256 digest or ciphertext-attestation field is unsupported by active rows; future profiles may add operational digests without replacing AES-GCM authentication and plaintext/request validation.

## Active implementation vs desirable production/conformance requirements

- Active validation imports P-256 JWKs through WebCrypto but does not explicitly schema-check every desirable JWK member, private-member absence, base64url spelling, IV decoded length, duplicate JSON members, or all mirrored non-id metadata before import/decrypt. The canonical states the stricter profile requirements for future conformance vectors.
- Active `assertSubmissionPlaintext` does not itself check that `submittedAt` is numeric, though active construction always emits a numeric millisecond timestamp (`rp-web/src/kiosk/protocol.ts:511-517`; `rp-web/src/kiosk/kiosk-provider.ts:171-175`).
- Active demo validates demo issuer/audience constants and provider app id, but production issuer/audience/key registries, revocation, rotation, and request-opening key custody remain §11/§13/deployment-profile work.
- Active browser/static demo key handling and technical debug displays expose key and plaintext details for demonstration. The canonical treats this as non-production behavior.
- Active completion UI opens and displays submissions but does not independently rerun all §6/§6.6/§8 validation before display; T4.C already requires validation before clinical workflow use (`spec-work/t4c-submission-completion/orchestrator-review.md:21-35`).
- Active tests prove important opacity and binding properties but are not a deterministic public conformance-vector suite. No fixed-randomness kiosk request JWS/envelope/submission vectors are checked in.
- Current Chrome/Android captures predate a kiosk-wrapper fixture suite and are same-device captures. They should remain historical/diagnostic until a refreshed capture is produced after §9, §11, §12, §13, §15, §16.6, and Appendix D expectations stabilize.

## Deferred open issues

- **§11 security:** production key custody for creator, request-opening, and desktop response keys; replay/freshness; pointer guessing; QR substitution; denial-of-service size/row limits; stale QR handling; cryptographic agility; plaintext/debug leakage.
- **§12 privacy:** provider metadata leakage, logs, analytics, retention, screenshots/browser history, public kiosk display, and debug UI minimization.
- **§13 registries:** permanent algorithm labels, JWS `typ`, content type, payload-kind values, provider profile ids, issuer/audience/key-id conventions, TTL/clock-skew/entropy profiles, and duplicate-member handling.
- **§15 implementation notes:** InstantDB-specific deployment guidance, browser key custody caveats, production cleanup, operational monitoring, and diagnostic capture procedures.
- **§16.6 and Appendix D/T6.C:** full kiosk byte ladder, deterministic vector generation, refreshed Android/Chrome capture, and final conformance-vector promotion criteria.
- **Fixture refresh:** a new human-assisted capture should be requested only after T4.D review if the orchestrator wants a current kiosk example. Prerequisites are a configured InstantDB app, current kiosk creator/submit pages, a supported phone browser/Credential Manager path, a demo wallet with non-PHI data, and capture tooling that records request rows, pointer URL, encrypted envelope/JWS-opening transcript, phone-local §8 request/response artifacts, submission row, ciphertext blob, decrypted submission, and validation reports.
