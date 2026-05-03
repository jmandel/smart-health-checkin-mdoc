# T4.C adjudication: submission and desktop completion

## Inputs and scope

This adjudication covers §9.8 through §9.12: the phone-to-desktop submission leg that begins only after T4.B phone resolution and phone-local §8 processing have produced a SMART response or other validated completion result. It does not reopen T4.A request creation/pointer transport or T4.B phone resolution/re-entry.

Accepted dependencies establish the controlling invariants:

- Kiosk is a wrapper around the same transport-neutral SMART request/response and the same-device §8 flow, not a second clinical protocol (`spec-work/t1c-architecture-roles-flows/canonical.md`; `spec-work/t4a-kiosk-request-pointer/canonical.md:1-16`).
- `KioskRequestPayload.smartRequest` directly embeds the §5 SMART request; no request-profile wrapper, preset, IPS shortcut, or broad clinical shortcut is canonical (`spec-work/t4a-kiosk-request-pointer/canonical.md:9-16`, `spec-work/t4a-kiosk-request-pointer/canonical.md:133-152`).
- The Pointer URL is pointer-only with fragment `#r=<requestId>` and does not carry §8 `DeviceRequest`, `encryptionInfo`, SMART response, response ciphertext, or secrets (`spec-work/t4a-kiosk-request-pointer/canonical.md:198-225`).
- The wrapper `KioskRequestPayload.requestId` is distinct from `smartRequest.id`; `SmartHealthCheckinResponse.requestId` echoes `smartRequest.id` (`spec-work/t4a-kiosk-request-pointer/canonical.md:140-152`; `spec-work/t2b-clinical-response-model/canonical.md:33-37`).
- T4.B ends after wrapper validation and phone-local §8 re-entry, preserving `encryptResponseTo` and `constraints` for T4.C (`spec-work/t4b-phone-resolution-reentry/canonical.md:1-8`, `spec-work/t4b-phone-resolution-reentry/canonical.md:124-141`).
- Trust layers remain separate; successful transport or wrapper processing does not create patient identity, Holder consent, mdoc issuer/device trust, or clinical-source provenance (`spec-work/t3a-trust-framework/canonical.md:5-15`, `spec-work/t3a-trust-framework/canonical.md:91-125`).

## Active implementation evidence checked

- `SubmissionPlaintext` is `{ requestId: string, submittedAt: number, payload: Record<string, unknown> }`; `EncryptedPayload` is `{ iv, ciphertext: Uint8Array, phoneEphemeralPublicKeyJwk }` (`rp-web/src/kiosk/protocol.ts:73-83`).
- Active constants are `KIOSK_MAX_PAYLOAD_BYTES = 25 * 1024 * 1024`, `KIOSK_MAX_BLOB_BYTES = KIOSK_MAX_PAYLOAD_BYTES + 1024`, blob content type `application/octet-stream`, request TTL ten minutes, and `KIOSK_RESPONSE_INFO = "smart-health-checkin-kiosk-response-v1"` (`rp-web/src/kiosk/protocol.ts:3-9`).
- `createKioskRequestJws` signs `encryptResponseTo.alg`, `desktopPublicKeyJwk`, and `constraints.maxPlaintextBytes`; active request ids are 32 random bytes base64url-encoded (`rp-web/src/kiosk/protocol.ts:146-175`).
- `encryptSubmissionPlaintext` serializes deterministic key-sorted JSON, enforces signed `constraints.maxPlaintextBytes`, generates a fresh P-256 phone key, imports signed `desktopPublicKeyJwk`, derives AES-GCM with ECDH + HKDF-SHA-256 using salt `requestId` and info `KIOSK_RESPONSE_INFO`, uses a 12-byte IV and AAD `utf8(requestId)`, and rejects blobs above `KIOSK_MAX_BLOB_BYTES` (`rp-web/src/kiosk/protocol.ts:306-339`).
- `decryptSubmissionPlaintext` uses the desktop private key, row phone ephemeral public JWK, row IV, same salt/info/AAD, parses JSON, and asserts a submission object (`rp-web/src/kiosk/protocol.ts:342-367`).
- `completeKioskRequest` constructs `SubmissionPlaintext` with wrapper `requestId`, numeric `submittedAt`, and caller-supplied payload, then calls provider `writeSubmission` (`rp-web/src/kiosk/kiosk-provider.ts:164-188`).
- `openKioskSubmission` downloads the blob, decrypts, and checks decrypted `requestId` against the wrapper request id (`rp-web/src/kiosk/kiosk-provider.ts:190-205`).
- Active provider contract exposes `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows` plus provider metadata (`rp-web/src/kiosk/kiosk-provider.ts:48-65`).
- Active InstantDB provider stores request rows as `{ requestId, encryptedRequest }`; submission rows include `submissionId`, `requestId`, `iv`, `storagePath`, `storageFileId`, and `phoneEphemeralPublicKeyJwk`; the ciphertext blob is `application/octet-stream` at `submissions/<requestId>/<submissionId>.bin`; download checks exact storage path and blob size (`rp-web/src/kiosk/instant-mailbox.ts:13-31`, `rp-web/src/kiosk/instant-mailbox.ts:49-90`, `rp-web/src/kiosk/instant-mailbox.ts:92-117`).
- `filterRowsForRequest` filters by exact wrapper `requestId` and a `submissions/<requestId>/` prefix (`rp-web/src/kiosk/kiosk-provider.ts:214-222`).
- Submit UI builds the active successful payload as `{ kind: "smart-health-checkin-response", smartResponse }` only after `openedResponse.smartResponseValidation.ok === true` (`rp-web/src/kiosk/submit-main.tsx:269-279`).
- The phone/local verifier validates SMART response against the original request with `validateResponseAgainstRequest` after opening the mdoc response (`rp-web/src/protocol/index.ts:655-683`; `rp-web/src/sdk/core.ts:254-310`).
- The desktop creator page currently opens and displays decrypted submissions but does not independently rerun full §6/§6.6 validation in that UI path (`rp-web/src/kiosk/creator-main.tsx:262-355`).
- Tests prove pointer-only URLs, opaque encrypted request storage, direct `smartRequest`, active payload kind, wrapper `requestId` binding, and absence of raw `dcapiResponse`/`deviceResponse` in the submitted payload (`rp-web/src/kiosk/kiosk-provider.test.ts:54-108`).
- Current docs state that response-size policy is transport/deployment-specific and that kiosk advertises `constraints.maxPlaintextBytes` (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:1164-1173`).

## Attempt comparison

### Main agreements

All five attempts agreed on the core shape and boundary: T4.C starts after §9.7/§8 has a result; top-level `SubmissionPlaintext.requestId` is the wrapper id; `payload.smartResponse.requestId` is `smartRequest.id`; the provider is untrusted; encryption uses P-256 ECDH, HKDF-SHA-256, AES-GCM, `requestId` salt/AAD, `smart-health-checkin-kiosk-response-v1` info, 12-byte IV, and a phone ephemeral public JWK; the active provider stores ciphertext as an opaque blob with slim row metadata; desktop completion must decrypt locally and then validate under §6/§7/§8.

All attempts also recommended single-use/duplicate policy, expiration handling, cleanup, rate limits, size limits, metadata minimization, and a provider abstraction rather than making InstantDB normative.

### Main disagreements

- **SHA-256 attestation/digest.** Attempt 01 made optional digest metadata explicit; attempts 02/04/05 rejected a required digest; attempt 03 allowed profile-defined digest. Active rows do not carry a digest, and AES-GCM already authenticates ciphertext. Canonical rejects any required SHA-256 attestation and leaves digest metadata optional for provider profiles.
- **How much §8 evidence desktop must receive.** Attempts varied between assuming the phone-local verifier's successful UI state is enough and requiring desktop-side §8 validation/evidence. Active submission carries only the SMART response wrapper, not raw §8 artifacts or an attestation. Canonical requires §6/§6.6 validation locally and requires deployments to account for §8 validation through trusted phone-local verifier state, retained evidence, or a design where the Completion display can validate it.
- **Size limits.** Attempts agreed on signed `maxPlaintextBytes` but differed on whether 25 MiB is normative. Canonical makes the signed constraint normative and cites 25 MiB plus 1024 as active implementation limits, not universal clinical limits.
- **Provider interface names.** Some attempts used `observeSubmissionRows`, while active code uses `useSubmissionRows`. Canonical names logical observation and cites active `useSubmissionRows` as an implementation name.
- **Payload extensions/failure notifications.** Attempts varied in whether to allow alternate payload kinds. Canonical defines only the active successful `smart-health-checkin-response` payload and allows extensions only by deployment/profile without weakening §6/§7/§8 validation or leaking plaintext to the relay.
- **Completion UI semantics.** Attempts differed in how strongly to mandate UI language. Canonical requires that provider notification is not clinical completion and recommends distinguishing received/opened/validated/accepted states.

## Accepted decisions

1. T4.C begins after T4.B and phone-local §8 processing; it does not redefine request creation, pointer resolution, or the SMART request/response models.
2. `SubmissionPlaintext` is a UTF-8 JSON object with wrapper `requestId`, numeric `submittedAt`, and `payload`. The active successful payload is `{ "kind": "smart-health-checkin-response", "smartResponse": <SmartHealthCheckinResponse> }`.
3. `SubmissionPlaintext.requestId` is `KioskRequestPayload.requestId`. `payload.smartResponse.requestId` is `KioskRequestPayload.smartRequest.id`.
4. Phone presenters enforce signed `constraints.maxPlaintextBytes` on the exact serialized plaintext before encryption. Active code also enforces an app plaintext maximum of 25 MiB and a ciphertext guard of 25 MiB + 1024 bytes.
5. Response submission encryption is ECDH P-256 + HKDF-SHA-256 + AES-256-GCM with salt/AAD `utf8(wrapper requestId)`, info `utf8("smart-health-checkin-kiosk-response-v1")`, fresh 96-bit IV, and fresh phone ephemeral P-256 key per submission.
6. The active provider row is slim: `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`; ciphertext is the raw AES-GCM ciphertext/tag bytes stored as `application/octet-stream`.
7. Desktop completion observes rows by wrapper `requestId`, downloads the blob, decrypts with the retained desktop private key corresponding to signed `desktopPublicKeyJwk`, checks decrypted wrapper `requestId`, then validates the payload under §6/§6.6 and applies §7/§8 trust policy before workflow use.
8. Provider metadata can route, deduplicate, clean up, or diagnose. It is not Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.
9. Single-use, expiration, cleanup, duplicate handling, stale QR behavior, rate limits, blob limits, logging minimization, and clock-skew policy are production/deployment requirements or guidance layered on top of active prototype behavior.
10. InstantDB/Instant Storage is only one implementation example; provider capabilities are normative at the abstraction level.

## Rejected or unsupported claims

- A required SHA-256 ciphertext attestation field is unsupported by active code.
- Provider rows or storage metadata as clinical trust evidence are rejected.
- Any request-profile wrapper, preset wrapper, IPS shortcut, “all of the above” selector, or inline `deviceRequest`/`encryptionInfo` carried through T4.C is rejected as stale or out of scope.
- Treating the wrapper `requestId` as the SMART response `requestId` is rejected.
- Treating the 25 MiB active implementation default as a universal clinical data-model maximum is rejected.
- Treating successful provider upload/download or row observation as Holder consent, patient matching, or clinical-source provenance is rejected.
- Claiming the desktop can independently reconstruct every §8 validation input from the active slim submission is unsupported; active payloads submit only the SMART response after phone-local validation.

## Implementation / production requirement mismatches

- Active `assertSubmissionPlaintext` verifies object shape, `requestId`, and `payload`, but not that `submittedAt` is numeric (`rp-web/src/kiosk/protocol.ts:511-517`). Canonical treats numeric `submittedAt` as part of the active profile because `completeKioskRequest` always constructs it that way (`rp-web/src/kiosk/kiosk-provider.ts:171-175`).
- Active creator/completion UI decrypts and displays a submission but does not independently rerun the full §6/§6.6 validation in the desktop path (`rp-web/src/kiosk/creator-main.tsx:262-355`). Canonical requires validation before clinical workflow use.
- Active demo does not implement authoritative provider-side single-use acceptance, retention cleanup, audit policy, rate-limit policy, or production key custody. Canonical distinguishes those production/deployment requirements from prototype behavior.
- Active browser-delivered demo key material and debug displays are useful for prototype review but are not production key-management or privacy patterns.

## Deferred open issues

- **T4.D / Appendix C / Appendix D:** CDDL, schema, fixture vectors, base64url field details, failure vectors, exact canonical JSON byte fixtures, and whether to include optional ciphertext digest/profile fields.
- **§11 security:** replay/freshness analysis, key custody, relay abuse, stale QR risks, cryptographic agility, and DoS limits.
- **§12 privacy:** metadata leakage, retention, logs, analytics, QR displays, debug UI, and minimization.
- **§13 registries:** algorithm labels, completion `payload.kind` values, provider profile identifiers, content types, and optional digest/attestation field registration.
- **§15 implementation notes:** concrete provider/back-end guidance, InstantDB-specific notes, browser/private-key handling, and operational cleanup.
- **§16.6 / Appendix D:** worked byte ladder and refreshed kiosk fixtures once T4.D closes.
