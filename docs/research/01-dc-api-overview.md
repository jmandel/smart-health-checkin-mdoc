# DC API on Android — request flow

Captured from: Chrome 141 dev blog, Android Developers Holder docs, digitalcredentials.dev,
W3C-FedID DC issue #36 (HOWTO).

Note: this is platform background. The active SMART Check-in design is the direct
`org-iso-mdoc` profile in [`07-smart-checkin-on-mdoc.md`](07-smart-checkin-on-mdoc.md). OID4VP examples
below are useful for contrast and deferred compatibility only.

## Status (April 2026)

- Chrome 141 (Sept 30 2025) and Safari 26 (Sept 15 2025) ship the API.
- W3C-FedID killed the open protocol registry at TPAC Nov 2025. The protocol-id field
  is now a **closed enum**:
  - `openid4vp-v1-unsigned`  ← will be the most common path
  - `openid4vp-v1-signed`
  - `openid4vp-v1-multisigned`
  - `org-iso-mdoc`           ← ISO 18013-7 Annex C native
  - `openid4vci-v1`          ← issuance, not relevant here

The CMWallet POC ships a `openid4vp1.0` string (pre-final). Don't rely on that for new
work — emit/parse the canonical names above.

## End-to-end call flow

```
RP page  ──navigator.credentials.get──▶  Browser
Browser  ──intent──▶                    Android Credential Manager (system)
System   ──registry lookup──▶           Match candidate wallets via WASM matchers
System   ──UI──▶                        User picks a wallet entry (system-rendered)
System   ──PendingIntent──▶             Wallet's HandlerActivity launched
Wallet   ──setGetCredentialResponse──▶  System
System   ──result──▶                    Browser
Browser  ──Promise resolve──▶           RP page receives { protocol, data }
```

## What the wallet receives in the PendingIntent

```kotlin
val req = PendingIntentHandler.retrieveProviderGetCredentialRequest(intent) ?: return
req.callingAppInfo.packageName    // browser package
req.callingAppInfo.origin         // RP web origin (only set for browser callers)
req.credentialOptions             // list of GetDigitalCredentialOption / GetCustomCredentialOption
```

Each option has:
- `type` (e.g., `com.credman.IdentityCredential`)
- `requestJson` — the JSON shown below

## requestJson shape

Top-level always:

```json
{
  "providers": [
    {
      "protocol": "openid4vp-v1-unsigned",
      "request": "<JSON-string>"   // doubly-encoded; parse once to unwrap
    }
  ]
}
```

The inner `request` (after one JSON-decode) for openid4vp:

```json
{
  "response_type": "vp_token",
  "nonce": "<base64url-rand>",
  "client_metadata": {
    "jwks": { "keys": [ { "kty": "EC", "crv": "P-256", "x":"...", "y":"...", "use":"enc", "alg":"ECDH-ES" } ] },
    "authorization_encrypted_response_alg": "ECDH-ES",
    "authorization_encrypted_response_enc": "A128GCM",
    "vp_formats_supported": { "mso_mdoc": {} }
  },
  "dcql_query": { "credentials": [ ... ] }
}
```

For `org-iso-mdoc`, the inner `request` is **CBOR (base64url'd)**, not JSON. We don't
parse it at the matcher layer — we just sniff the protocol string and surface an
entry; the handler activity decodes when needed.

## Wallet response shape

What the wallet writes back:

```kotlin
val responseJson = """
  {"protocol":"openid4vp-v1-unsigned","data":{"response":"<jwe>"}}
""".trimIndent()
PendingIntentHandler.setGetCredentialResponse(
    resultData,
    GetCredentialResponse(DigitalCredential(responseJson))
)
setResult(RESULT_OK, resultData); finish()
```

The JS side then sees:

```js
{ protocol: "openid4vp-v1-unsigned", data: { response: "<jwe>" } }
```

For `org-iso-mdoc`, the wallet writes raw HPKE-encrypted DeviceResponse bytes
(base64url'd) — no `response` JSON wrapper.
