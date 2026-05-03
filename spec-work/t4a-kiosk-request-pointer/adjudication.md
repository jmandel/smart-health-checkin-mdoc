# T4.A adjudication: kiosk request creation and pointer transport

## Inputs and scope

This adjudication covers §9.1-§9.6 only: kiosk request creation, the signed kiosk request payload, encrypted request publication, and pointer URL/QR transport. The dependency tree assigns this scope to T4.A and defers phone resolution/re-entry to T4.B, submission/completion to T4.C, and kiosk CDDL/fixtures to T4.D (`spec.md.outline.dependency_tree:277-320`). The methodology requires organizer synthesis based on evidence rather than majority vote (`spec-work/methodology.md:75-88`).

The accepted prerequisites require preserving these invariants: SMART request/response are transport-neutral clinical JSON objects (`spec-work/t1c-architecture-roles-flows/canonical.md:11-35`); kiosk wraps and re-enters the base same-device flow rather than defining a second clinical protocol (`spec-work/t1c-architecture-roles-flows/canonical.md:71-89`); the Kiosk creator embeds the SMART request directly as `smartRequest` (`spec-work/t1c-architecture-roles-flows/canonical.md:121-131`); request display fields are not authenticated requester identity (`spec-work/t2a-clinical-request-model/canonical.md:78-112`); `profilesFrom[]` is an array and `profiles[]`/`profilesFrom[]` are additive selectors (`spec-work/t2a-clinical-request-model/canonical.md:296-322`); the base §8 flow carries the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and returns the SMART response in `smart_health_checkin_response` (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md:23-27`).

## Active implementation evidence

Key active behavior comes from `rp-web/src/kiosk/protocol.ts`:

- The request JWS uses `alg: "ES256"`, `kid`, and `typ: "smart-health-checkin+kiosk-request+jws"` (`rp-web/src/kiosk/protocol.ts:10-18`, `rp-web/src/kiosk/protocol.ts:176-181`).
- The active `KioskRequestPayload` fields are `v`, `iss`, `aud`, `requestId`, `createdAt`, `expiresAt`, `submitTo`, `smartRequest`, `encryptRequestTo`, `encryptResponseTo`, `constraints`, and `minter`; `smartRequest` is a `SmartCheckinRequest` embedded directly (`rp-web/src/kiosk/protocol.ts:20-46`, `rp-web/src/kiosk/protocol.ts:149-175`).
- The active `EncryptedKioskRequest` fields are `v`, `alg`, `enc`, `contentType`, `requestId`, `createdAt`, `expiresAt`, `creatorKeyId`, `recipientKeyId`, `iv`, `ciphertext`, and `ephemeralPublicKeyJwk` (`rp-web/src/kiosk/protocol.ts:48-61`, `rp-web/src/kiosk/protocol.ts:216-229`).
- The active request-envelope suite is P-256 ECDH plus HKDF-SHA-256 plus AES-256-GCM, labeled `ECDH-P256+HKDF-SHA256+AES-GCM`, with `enc: "A256GCM"`, `salt = utf8(requestId)`, `info = "smart-health-checkin-kiosk-request-v1"`, 12-byte IV, and AAD `utf8(requestId)` (`rp-web/src/kiosk/protocol.ts:189-215`, `rp-web/src/kiosk/protocol.ts:430-459`).
- The compact JWS signing input uses recursively key-sorted JSON before base64url encoding (`rp-web/src/kiosk/protocol.ts:387-400`, `rp-web/src/kiosk/protocol.ts:556-570`).
- The active pointer URL is fragment parameter `#r=<requestId>` (`rp-web/src/kiosk/protocol.ts:370-380`; also `rp-web/src/kiosk/kiosk-provider.ts:208-211`).
- The active provider request row stores `requestId` and `encryptedRequest` and rejects mismatch with the signed payload (`rp-web/src/kiosk/instant-mailbox.ts:13-31`). The provider abstraction exposes request read/write separately from later submission operations (`rp-web/src/kiosk/kiosk-provider.ts:48-65`).
- Active tests assert the QR URL starts with `#r=`, does not contain clinical text, the stored encrypted request does not expose clinical strings, and the resolved payload contains `smartRequest` directly rather than `request` or `presetId` (`rp-web/src/kiosk/kiosk-provider.test.ts:54-79`).
- Active demo keys are explicitly checked in for static-demo use only and not production traffic (`rp-web/src/kiosk/demo-keys.ts:3-9`).

Additional context: the current kiosk creator passes a SMART request to `initiateKioskRequest`, creates a QR from the resulting `submitUrl`, and displays request pointer details (`rp-web/src/kiosk/creator-main.tsx:241-255`, `rp-web/src/kiosk/creator-main.tsx:153-172`). The phone page parses `#r`, resolves the encrypted request, validates the embedded `smartRequest`, and invokes same-device presentation later; those details are T4.B/T4.C context only (`rp-web/src/kiosk/submit-main.tsx:37-63`, `rp-web/src/kiosk/submit-main.tsx:185-211`). An older SDK helper encodes `deviceRequest` and `encryptionInfo` into a fragment (`rp-web/src/sdk/kiosk-session.ts:12-23`, `rp-web/src/sdk/kiosk-session.ts:55-80`); this conflicts with the active pointer-only request wrapper and is treated as legacy/stale for T4.A.

## Attempt-by-attempt assessment

### Attempt 01

Strengths: concise; correctly keeps kiosk as a wrapper, embeds `smartRequest` directly, identifies the active JWS/envelope field names, keeps QR pointer-only, and notes the demo key custody and legacy `KioskSessionDescriptor` issues (`spec-work/t4a-kiosk-request-pointer/attempt-01.md:1-16`, `spec-work/t4a-kiosk-request-pointer/attempt-01.md:181-194`).

Weaknesses: it overstates some phone-side resolver rejection requirements in this cutpoint, gives less detail on role boundaries than attempts 02-04, and includes response-submission suite details in §9.3 beyond what T4.A should specify (`spec-work/t4a-kiosk-request-pointer/attempt-01.md:41-43`).

### Attempt 02

Strengths: strongest role/trust-boundary table, clear warning that the request-encryption private key must not belong to the untrusted relay, precise distinction between request and response HKDF info values, and good downstream issue list (`spec-work/t4a-kiosk-request-pointer/attempt-02.md:18-31`, `spec-work/t4a-kiosk-request-pointer/attempt-02.md:67-70`, `spec-work/t4a-kiosk-request-pointer/attempt-02.md:223-236`).

Weaknesses: it is somewhat more prescriptive about production key custody than T4.A can fully close, and it leans toward standardizing demo `iss`/`aud` values in examples before registry/conformance work has accepted them (`spec-work/t4a-kiosk-request-pointer/attempt-02.md:75-125`).

### Attempt 03

Strengths: best compact cryptographic table, precise custom canonical JSON description, good distinction between wrapper `requestId` and `smartRequest.id`, and strong envelope validation/binding text (`spec-work/t4a-kiosk-request-pointer/attempt-03.md:50-72`, `spec-work/t4a-kiosk-request-pointer/attempt-03.md:127-148`, `spec-work/t4a-kiosk-request-pointer/attempt-03.md:150-179`).

Weaknesses: it defines several decrypting-processor requirements that belong more naturally to T4.B, and it repeats active demo constants in payload examples rather than using deployable placeholder syntax (`spec-work/t4a-kiosk-request-pointer/attempt-03.md:78-88`, `spec-work/t4a-kiosk-request-pointer/attempt-03.md:177-179`).

### Attempt 04

Strengths: most polished request/pointer prose, best avoidance of stale labels (`requestProfile`, IPS, “all of the above”), careful use of placeholders instead of demo constants, and good treatment of QR/pointer as a bearer locator with metadata risks (`spec-work/t4a-kiosk-request-pointer/attempt-04.md:1-18`, `spec-work/t4a-kiosk-request-pointer/attempt-04.md:121-145`, `spec-work/t4a-kiosk-request-pointer/attempt-04.md:200-224`).

Weaknesses: it says the QR must not include “FHIR profile details,” which is too broad as phrased because URL path text could incidentally contain non-clinical words; the clearer rule is that the QR must not contain the plaintext SMART request or clinical selector content. It also states future §9.7 verification in a few places that should remain deferred.

### Attempt 05

Strengths: clear deployable field semantics, explicit relay metadata minimization, accurate active field list, and good “request-decryption recipient” terminology that avoids trusting the relay (`spec-work/t4a-kiosk-request-pointer/attempt-05.md:45-115`, `spec-work/t4a-kiosk-request-pointer/attempt-05.md:117-146`, `spec-work/t4a-kiosk-request-pointer/attempt-05.md:181-194`).

Weaknesses: it under-specifies entropy/freshness compared with attempts 02-04, and it includes `same-device DeviceRequest` in the QR exclusion list without explaining that this is a rejection of legacy SDK helper behavior rather than active kiosk wrapper behavior (`spec-work/t4a-kiosk-request-pointer/attempt-05.md:158-170`, `rp-web/src/sdk/kiosk-session.ts:55-80`).

## Contradictions resolved

1. **Demo constants vs deployable issuer/audience.** Active code hard-codes demo `iss` and `aud` (`rp-web/src/kiosk/protocol.ts:11-12`, `rp-web/src/kiosk/protocol.ts:149-153`), but prerequisites and production suitability require deployment-policy identifiers. Canonical text defines the fields and notes active demo values only in adjudication; it does not require those strings for production.
2. **Relay key custody.** Active names use “submission service” key identifiers (`rp-web/src/kiosk/protocol.ts:124-135`, `rp-web/src/kiosk/protocol.ts:161-164`), and demo configuration includes the corresponding private key in browser code (`rp-web/src/kiosk/demo-keys.ts:3-9`, `rp-web/src/kiosk/demo-keys.ts:56-63`). Because the Submission service is untrusted (`spec-work/t1c-architecture-roles-flows/canonical.md:127-131`), canonical text calls this a request-opening recipient key and states that an untrusted relay must not need plaintext access or decryption keys.
3. **Pointer-only QR vs legacy inline session descriptor.** Active creator/provider code and tests use `#r=<requestId>` only (`rp-web/src/kiosk/kiosk-provider.ts:208-211`, `rp-web/src/kiosk/kiosk-provider.test.ts:63-69`), while `KioskSessionDescriptor` can inline `deviceRequest` and `encryptionInfo` (`rp-web/src/sdk/kiosk-session.ts:12-23`, `rp-web/src/sdk/kiosk-session.ts:55-80`). Canonical text follows active request-wrapper behavior and treats the older SDK helper as stale or out of scope.
4. **Custom ECDH/HKDF/AES-GCM vs JOSE/JWE/HPKE labels.** Attempts correctly avoided inventing JWE or HPKE names. Canonical text preserves active labels and primitive composition from code (`rp-web/src/kiosk/protocol.ts:189-229`, `rp-web/src/kiosk/protocol.ts:430-459`) and defers registry naming to §13/T4.D.
5. **Canonical JSON.** Active code signs a local deterministic JSON form (`rp-web/src/kiosk/protocol.ts:387-400`, `rp-web/src/kiosk/protocol.ts:556-570`), not a named RFC canonicalization scheme. Canonical text states the active rule for this profile without pretending it is a registered canonical JSON standard; fixture exactness is deferred.
6. **Kiosk `requestId` vs SMART request `id`.** The active code uses wrapper `requestId` for relay/pointer and preserves `smartRequest.id` for the clinical response binding (`rp-web/src/kiosk/protocol.ts:148-160`; `spec-work/t2b-clinical-response-model/canonical.md:33-37`). Canonical text prohibits substituting one for the other.
7. **How much T4.C to include.** `encryptResponseTo` and `constraints.maxPlaintextBytes` are active signed request fields (`rp-web/src/kiosk/protocol.ts:165-171`; `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:1164-1173`), but submission encryption/completion is T4.C. Canonical text includes those fields as signed request metadata only and defers their operational semantics.

## Deferred open issues

- **T4.B (§9.7):** pointer fetch; relay row, envelope, and payload `requestId` binding; decryption; JWS verification; creator key trust; expiry checks; `submitTo` provider checks; validation of the embedded `smartRequest`; and re-entry into §8.
- **T4.C (§§9.8-§9.12):** response-submission plaintext shape, encryption to `encryptResponseTo.desktopPublicKeyJwk`, `constraints.maxPlaintextBytes` enforcement, submission rows/blobs, provider abstraction, replay/single-use, and Completion display processing.
- **T4.D / future fixture refresh:** CDDL/schema for `KioskRequestPayload`, compact JWS, `EncryptedKioskRequest`, base64url encodings, canonical JSON signing inputs, HKDF salt/info/AAD, and pointer examples; decide whether to refresh fixture captures after §9 and conformance closure.
- **§11 security/privacy:** QR substitution, pointer guessing and bearer-locator handling, relay metadata leakage, demo private-key material, production key custody, creator-key trust and rotation, expiration and cleanup, logging, analytics, and denial-of-service.
- **§13 conformance/registries:** permanent registration of the JWS `typ`, content type, algorithm label, issuer/audience conventions, key identifiers, and whether exact TTLs, entropy lengths, clock-skew windows, and canonical JSON rules become core or profile-specific requirements.
