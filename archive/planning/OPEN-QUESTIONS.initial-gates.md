# Open questions / gates

Grouped by where they bite us. **★ = blocks useful end-to-end demo.**

## Protocol mapping

1. **`requestInfo` exposure ★**
   The active path puts the dynamic SMART request in
   `ItemsRequest.requestInfo.smart_health_checkin`. Confirm whether Android and
   iOS wallet APIs expose this value to apps. If either platform hides it, fall
   back to claim-name encoding.

2. **Maximum safe `requestInfo` size ★**
   Need empirical caps through Chrome/Safari, Android Credential Manager, the
   matcher, and the handler. Probe 512 B, 2 KB, 8 KB, 32 KB, and 128 KB decoded
   JSON payloads.

3. **Fallback claim-name encoding**
   Reserve `shc1j.<base64url(json)>` and `shc1d.<base64url(deflate(json))>` as
   fallback element identifiers if `requestInfo` is not exposed. Do not use this
   in the primary path.

4. **UI rendering of raw element identifiers**
   The active element is the stable `smart_health_checkin_response`, so raw UI
   rendering is acceptable. If we fall back to `shc1j...`, revisit whether
   platform-owned UI exposes long encoded claim names.

## Android Credential Manager

5. **Registration API ★**
   Confirm current Jetpack `credentials-registry` / `RegistryManager` support
   for custom WASM matchers:
   - class names;
   - registration type string;
   - matcher import ABI;
   - whether request JSON shape exactly matches the browser argument or the
     older provider envelope.

6. **Matcher language**
   Rust and C are both viable. Rust reference remains
   `research/shl-wallet-matcher_rs/`; avoid `HashMap` / entropy traps.

7. **Handler request shape ★**
   Capture `ProviderGetCredentialRequest` for our generated direct
   `org-iso-mdoc` request and confirm where `data.deviceRequest` and
   `data.encryptionInfo` land.

## Response construction

8. **HPKE implementation ★**
   Need interoperable direct-mdoc HPKE support for Android and TypeScript:
   P-256, HKDF-SHA256, AES-128-GCM. The wallet returns CBOR
   `["dcapi", {enc, cipherText}]`, not JWE.

9. **Direct `dcapi` SessionTranscript ★**
   Implement and golden-test:

   ```text
   encryptionInfo = base64url(cbor(["dcapi", {nonce, recipientPublicKey}]))
   [null, null, ["dcapi", sha256(cbor([encryptionInfo, origin]))]]
   ```

10. **DeviceResponse canonical CBOR ★**
    Need deterministic encoding for `IssuerSignedItem`, MSO digests, COSE_Sign1,
    and DeviceAuth.

11. **Self-signed issuer/device keys**
    Decide whether to use one persistent key or separate issuer/device keys.
    Persistent Keystore key is likely enough for demos.

## FHIR semantics

12. **Initial item vocabulary**
    Dynamic JSON can carry any profile or Questionnaire, but demos need presets:
    Patient, Coverage, IPS, and one inline Questionnaire.

13. **Questionnaire URL fetch policy**
    Inline Questionnaires first. URL fetch should be explicit and visible to the
    user, or deferred.

14. **Signing strategies**
    `signing: ["none", "shc_v1"]` remains an application hint. Decide after raw
    FHIR resource flow works.

## iOS / portability

15. **Real Safari capture**
    Mattr branches to direct `org-iso-mdoc` for Safari-like identities. Confirm
    with real Safari/Web Inspector, not only Chromium UA emulation.

16. **Custom docType registration on iOS**
    Confirm whether a third-party iOS wallet can register for
    `org.smarthealthit.checkin.1`, and what presentation APIs expose.

## Things no longer load-bearing

- OpenID4VP custom sibling parameters
- `transaction_data`
- per-profile static claim names like `coverage`, `patient`, `ips`
- dynamic `shc1j...` claim names in the primary path

## Historical branch

OpenID4VP/DCQL/JWE is no longer the active implementation path. See
`OPEN-QUESTIONS-OID4VP-MDOC.md` for the browser-branching investigation and any
future fallback work.
