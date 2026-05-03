# T4.B adjudication: phone resolution and same-device re-entry

## Inputs and scope

This adjudication covers §9.7 only: what the Phone presenter does after opening the §9.6 Pointer URL and before response submission. The dependency tree assigns T4.B to pointer resolution and same-device re-entry, after T4.A and before T4.C submission/completion (`spec.md.outline.dependency_tree:292-313`). The methodology requires the organizer to compare all attempts, resolve contradictions against active behavior, and write both `adjudication.md` and `canonical.md` without choosing by majority vote (`spec-work/methodology.md:75-88`).

Accepted dependencies establish the controlling invariants:

- The kiosk flow is a wrapper around the base same-device flow, not a second clinical protocol (`spec-work/t1c-architecture-roles-flows/canonical.md:71-89`).
- The signed kiosk payload embeds the complete SMART request directly as `smartRequest`, and demo presets or SDK wrappers are not protocol substitutes (`spec-work/t4a-kiosk-request-pointer/canonical.md:9-16`, `spec-work/t4a-kiosk-request-pointer/canonical.md:133-152`).
- The Pointer URL is pointer-only and carries `#r=<requestId>`; it does not carry plaintext clinical content, `EncryptedKioskRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, Wallet response bytes, response material, or secrets (`spec-work/t4a-kiosk-request-pointer/canonical.md:198-225`).
- The kiosk wrapper `requestId` is separate from `smartRequest.id`; the later SMART response echoes `smartRequest.id` as `SmartHealthCheckinResponse.requestId` (`spec-work/t4a-kiosk-request-pointer/canonical.md:140-152`; `spec-work/t2b-clinical-response-model/canonical.md:33-37`).
- The base §8 flow carries the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, requests `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`, and validates the returned response under §8.7/§8.8 and §6.6 (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md:23-27`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:326-350`).
- Request display fields such as `purpose`, item `title`, and item `summary` are Holder-facing context, not authenticated requester identity (`spec-work/t2a-clinical-request-model/canonical.md:78-112`; `spec-work/t3a-trust-framework/canonical.md:17-33`).

## Active implementation evidence

The active code path is pointer-only and wrapper-based:

- `buildSubmitUrl` / `kioskRequestPointerFromLocationHash` use only fragment parameter `r` and reject a missing `#r=` pointer (`rp-web/src/kiosk/protocol.ts:370-380`).
- `KioskRequestPayload` contains `v`, `iss`, `aud`, wrapper `requestId`, `createdAt`, `expiresAt`, `submitTo`, direct `smartRequest`, `encryptRequestTo`, `encryptResponseTo`, `constraints`, and `minter` (`rp-web/src/kiosk/protocol.ts:20-46`, `rp-web/src/kiosk/protocol.ts:149-175`).
- `EncryptedKioskRequest` contains the active version, algorithm labels, content type, wrapper `requestId`, timestamps, key ids, `iv`, `ciphertext`, and `ephemeralPublicKeyJwk` (`rp-web/src/kiosk/protocol.ts:48-61`, `rp-web/src/kiosk/protocol.ts:216-229`).
- `resolveKioskRequest` reads a provider request row by pointer id, imports request-opening private key material, calls `openEncryptedKioskRequest`, and verifies row `requestId` against the signed payload (`rp-web/src/kiosk/kiosk-provider.ts:142-162`). The Instant provider read path returns a row whose `requestId` matches the lookup id or fails not-found (`rp-web/src/kiosk/instant-mailbox.ts:33-47`).
- `openEncryptedKioskRequest` asserts the envelope, rejects expired envelopes, derives AES-GCM key material with `salt = requestId`, `info = KIOSK_REQUEST_INFO`, decrypts with AAD `utf8(requestId)`, verifies the compact JWS, and rejects envelope/payload `requestId` mismatch (`rp-web/src/kiosk/protocol.ts:232-268`).
- `verifyKioskRequestJws` requires exactly three compact JWS parts, parses the protected header, requires a trusted public key for `kid`, verifies ES256 over the original signing input, parses the payload, and invokes payload validation (`rp-web/src/kiosk/protocol.ts:270-304`). Header validation requires `alg: "ES256"`, the kiosk request `typ`, and non-empty `kid` (`rp-web/src/kiosk/protocol.ts:472-479`).
- Payload validation currently checks demo issuer/audience constants, `submitTo.backend`, `submitTo.appId`, expiration, future `createdAt`, size constraint ceiling, request/response algorithm labels, non-empty `minter.keyId`, and `validateSmartCheckinRequest(payload.smartRequest)` (`rp-web/src/kiosk/protocol.ts:403-428`). These demo constants are implementation evidence, not production registry values.
- The submit page parses `#r`, calls `resolveKioskRequest`, validates the embedded request again with `validateSmartCheckinRequest`, displays request context, and passes the embedded `smartRequest` to same-device `SmartCheckinButton` (`rp-web/src/kiosk/submit-main.tsx:37-63`, `rp-web/src/kiosk/submit-main.tsx:46-50`, `rp-web/src/kiosk/submit-main.tsx:185-211`).
- Tests assert that the URL starts with `#r=`, the URL and stored encrypted request do not expose clinical strings, the resolved payload contains `smartRequest` directly, and the eventual SMART response uses the original SMART request id (`rp-web/src/kiosk/kiosk-provider.test.ts:54-79`, `rp-web/src/kiosk/kiosk-provider.test.ts:80-108`).
- Demo request-opening private key material is intentionally checked in for static demo use and is not production key management (`rp-web/src/kiosk/demo-keys.ts:3-9`, `rp-web/src/kiosk/demo-keys.ts:56-63`).
- `rp-web/src/sdk/kiosk-session.ts` still defines a legacy/stale fragment that inlines `deviceRequest` and `encryptionInfo` (`rp-web/src/sdk/kiosk-session.ts:12-23`, `rp-web/src/sdk/kiosk-session.ts:55-80`). This contradicts the accepted pointer-only wrapper and is not adopted.

## Attempt-by-attempt assessment

### Attempt 01

Strengths: Clear scope statement; strong pointer-only language; detailed envelope validation, decryption inputs, JWS verification sequence, SMART request distinction, §8 re-entry, trust-boundary preservation, and failure list (`spec-work/t4b-phone-resolution-reentry/attempt-01.md:1-132`).

Weaknesses: It is more prescriptive than accepted T4.A about a deployable key custody model in the normative body, states some envelope/payload consistency checks as absolute before T4.D has CDDL/fixture closure, and includes organizer notes inside the attempt rather than keeping canonical prose clean (`spec-work/t4b-phone-resolution-reentry/attempt-01.md:134-156`).

### Attempt 02

Strengths: Best overall cutpoint framing and role separation. It explicitly covers provider row/envelope retrieval, four-way wrapper `requestId` binding, untrusted-relay request-opening private key boundaries, deployment-policy issuer/audience trust, SMART request §5 validation, and phone-local construction of a fresh §8 request (`spec-work/t4b-phone-resolution-reentry/attempt-02.md:1-133`). It also accurately treats demo issuer/audience values as non-production (`spec-work/t4b-phone-resolution-reentry/attempt-02.md:135-143`).

Weaknesses: It says mirrored envelope metadata checks are only SHOULD-level in one place while T4.A already says the Kiosk creator sets envelope times and key ids from signed/header values (`spec-work/t4a-kiosk-request-pointer/canonical.md:179-183`). The canonical below makes the minimum id binding a SHALL and treats non-id mirrored metadata as profile/deployment policy until T4.D closes fixtures.

### Attempt 03

Strengths: Concise and implementation-oriented. It gives a clean list of required inputs, exact pointer parsing, request-id binding table, request-opening suite, JWS checks, direct `smartRequest` validation, and a same-device-result handoff that explicitly stops before T4.C (`spec-work/t4b-phone-resolution-reentry/attempt-03.md:1-144`).

Weaknesses: It includes §8 same-device result processing as its own §9.7.8 (`spec-work/t4b-phone-resolution-reentry/attempt-03.md:118-122`). The cutpoint may mention that §8 validation precedes T4.C handoff, but should avoid expanding response submission or completion semantics and should not make T4.B look like it owns all post-wallet processing.

### Attempt 04

Strengths: Most compact canonical-style attempt. It accurately separates wrapper `requestId` and `smartRequest.id`, lists active validation fields, warns against `requestProfile`/preset/IPS shortcuts, states that §8 artifacts are generated on the phone after validation, and provides a practical failure list (`spec-work/t4b-phone-resolution-reentry/attempt-04.md:1-128`).

Weaknesses: It under-specifies exact pointer/provider/envelope/signed-payload binding compared with attempts 01-03, and it describes same-device re-entry without naming enough §8 construction details to prevent implementers from reusing legacy inline `deviceRequest`/`encryptionInfo` fragments.

### Attempt 05

Strengths: Strongest failure taxonomy and clear statement that the Pointer URL is only a locator and contains no compact JWS, envelope, SMART request, §8 artifacts, response, or submission material (`spec-work/t4b-phone-resolution-reentry/attempt-05.md:7-18`, `spec-work/t4b-phone-resolution-reentry/attempt-05.md:124-144`). It also correctly calls out active code's `SmartCheckinButton` re-entry behavior while keeping framework-specific detail out of normative requirements (`spec-work/t4b-phone-resolution-reentry/attempt-05.md:146-158`).

Weaknesses: It includes detailed §8 result validation and response handoff as a separate subsection (`spec-work/t4b-phone-resolution-reentry/attempt-05.md:118-123`), which risks expanding T4.B beyond resolution/re-entry. It also says `expiresAt` is optional on the envelope in one validation bullet (`spec-work/t4b-phone-resolution-reentry/attempt-05.md:50-57`), while accepted T4.A makes it part of the envelope field set (`spec-work/t4a-kiosk-request-pointer/canonical.md:160-183`).

## Contradictions resolved

1. **Pointer-only vs legacy inline same-device descriptors.** Active T4.A and active provider tests use `#r=<requestId>` only (`spec-work/t4a-kiosk-request-pointer/canonical.md:202-219`; `rp-web/src/kiosk/kiosk-provider.test.ts:63-69`). The older `KioskSessionDescriptor` fragment embeds `deviceRequest` and `encryptionInfo` (`rp-web/src/sdk/kiosk-session.ts:55-80`) and is treated as legacy/stale context. Canonical §9.7 therefore requires phone-local §8 construction after wrapper validation and prohibits using QR/row/envelope/JWS material as §8 `DeviceRequest` or `encryptionInfo`.
2. **Request-opening private key terminology.** Active code names the key pair “submission service” (`rp-web/src/kiosk/kiosk-provider.ts:67-74`; `rp-web/src/kiosk/protocol.ts:124-135`), and the static demo ships private key material in browser-delivered configuration (`rp-web/src/kiosk/demo-keys.ts:3-9`, `rp-web/src/kiosk/demo-keys.ts:56-63`). Because the accepted relay is untrusted (`spec-work/t4a-kiosk-request-pointer/canonical.md:18-37`), canonical text calls this request-opening private key material and requires a deployable profile to keep an untrusted relay out of the plaintext boundary. The demo gap is deferred to §11/§13/deployment profiles.
3. **Demo issuer/audience constants vs production policy.** Active validation checks `KIOSK_CREATOR_ISSUER` and `KIOSK_SUBMISSION_SERVICE_AUDIENCE` demo constants (`rp-web/src/kiosk/protocol.ts:10-12`, `rp-web/src/kiosk/protocol.ts:403-412`). Canonical text requires issuer/audience acceptance under deployment policy and does not standardize the demo strings.
4. **Envelope metadata strictness.** Active code checks envelope version/algorithm/content type and expiration and binds envelope `requestId` to signed payload (`rp-web/src/kiosk/protocol.ts:239-266`, `rp-web/src/kiosk/protocol.ts:494-509`). T4.A says the Kiosk creator sets envelope timestamps and key ids from corresponding signed/header fields (`spec-work/t4a-kiosk-request-pointer/canonical.md:179-183`). Canonical §9.7 requires id binding and validation of version/algorithm/content type/key availability; it notes that mirrored non-id metadata consistency is required where the selected profile defines it, leaving exact fixture-level treatment to T4.D.
5. **`smartRequest` validation location.** Active code validates embedded `smartRequest` during payload validation and the phone UI validates again before enabling same-device sharing (`rp-web/src/kiosk/protocol.ts:424-426`; `rp-web/src/kiosk/submit-main.tsx:46-50`, `rp-web/src/kiosk/submit-main.tsx:87-89`). Canonical text makes the outcome a Phone presenter requirement, not an SDK layering requirement.
6. **How much T4.C to mention.** Active submit UI combines resolution, same-device invocation, and encrypted submission (`rp-web/src/kiosk/submit-main.tsx:77-105`, `rp-web/src/kiosk/submit-main.tsx:185-211`), and active protocol code contains `encryptSubmissionPlaintext` (`rp-web/src/kiosk/protocol.ts:306-335`). T4.B canonical only preserves signed `encryptResponseTo` and constraints as metadata for later handoff. Submission plaintext, encryption, rows, completion display, replay, and success status are T4.C.
7. **Wrapper failure vs clinical response statuses.** A missing pointer, failed decryption, bad JWS, invalid wrapper, or invalid embedded SMART request prevents Wallet invocation. In contrast, Holder refusal, unavailable content, unsupported item selectors, partial fulfillment, and item-level errors after a valid §8 request are SMART response statuses under §6 (`spec-work/t2b-clinical-response-model/canonical.md:255-260` and following). Canonical §9.7 distinguishes these categories.

## Deferred open issues

- **T4.C (§§9.8-§9.12):** response-submission plaintext shape, encryption to signed `encryptResponseTo.desktopPublicKeyJwk`, enforcement of `constraints.maxPlaintextBytes`, submission rows/blobs, replay/single-use behavior, completion-display validation, phone-to-desktop failure notification, and provider abstraction.
- **T4.D:** CDDL/schema/fixture rules for `KioskRequestPayload`, protected JWS headers, deterministic JSON signing input, `EncryptedKioskRequest`, base64url fields, mirrored metadata, request-id binding examples, failure vectors, and fixture refresh decisions.
- **§11 security / §12 privacy:** QR substitution, pointer guessing, bearer-locator handling, metadata leakage through provider ids/key ids/timing, demo private-key material in browser code, production key custody, error-message leakage, relay retention, logging, telemetry, and denial-of-service.
- **§13 conformance/registries:** permanent JWS `typ`, content type, algorithm labels, issuer/audience conventions, creator-key and request-opening-key registries, provider identifiers, TTLs, entropy requirements, clock-skew windows, size ceilings, duplicate-member handling, and whether exact mirrored-metadata checks are core or deployment-profile requirements.
- **Future fixture refresh:** After T4.C/T4.D and conformance closure, decide whether to refresh kiosk fixtures to exercise pointer resolution, wrapper validation failures, and phone-local §8 re-entry with current SMART request examples.

## Conformance inventory for Appendix A draft

| Section | Target | Requirement summary |
| --- | --- | --- |
| §9.7.1 | Phone presenter | Parse fragment parameter `r`; reject missing/empty/malformed active pointers; do not infer request ids from inline §8 or display fields. |
| §9.7.2 | Phone presenter | Fetch/read the provider row or envelope for the pointer id; fail safely for missing, malformed, ambiguous, or unavailable state. |
| §9.7.3 | Phone presenter | Bind pointer `r`, provider row id when present, envelope `requestId`, and verified payload `requestId` by exact equality. |
| §9.7.4 | Phone presenter | Validate active envelope version, algorithm labels, content type, required fields, expiration/freshness, and request-opening key acceptability. |
| §9.7.5 | Phone presenter | Open `EncryptedKioskRequest` with the §9.3 ECDH/HKDF/AES-GCM construction and reject decryption/authentication/plaintext/JWS syntax failures. |
| §9.7.6 | Phone presenter | Verify compact request JWS header, trusted creator key, ES256 signature, issuer/audience/provider policy, timestamps, algorithm labels, constraints, key ids, and payload shape before use. |
| §9.7.7 | Phone presenter | Validate embedded `smartRequest` under §5 and keep wrapper `requestId` distinct from `smartRequest.id`. |
| §9.7.8 | Phone presenter / phone-local Verifier | Construct a fresh §8 `org-iso-mdoc` request on the phone using the validated `smartRequest`; do not reuse QR/pointer/wrapper material as §8 artifacts. |
| §9.7.9 | Phone presenter and related roles | Preserve trust boundaries; wrapper validation does not prove Holder consent, requester identity, patient identity, clinical-source provenance, downstream authorization, or production trust. |
| §9.7.10 | Phone presenter | Fail safely for listed resolution, wrapper, request-validation, and same-device invocation failures; do not fabricate SMART responses or completion success. |

## Cross-reference and appendix implications

- Appendix A should include the conformance inventory above after final section numbering stabilizes.
- T4.D should mirror the exact field names, algorithm labels, JWS `typ`, content type, HKDF info, AAD, and pointer-only `#r` profile from T4.A/T4.B.
- §11/§12 should revisit the risk notes listed above without changing T4.B processing order.
- §13 should decide which deployment-policy values become registered conformance-profile values.
