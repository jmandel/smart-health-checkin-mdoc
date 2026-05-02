# SessionTranscript, handover, and response encryption

The two pieces most likely to bite during M3. Spec text is thinnest exactly here, so
this doc is partly "what we know" and partly "what we still need to confirm against a
reference implementation or capture."

**Primary protocol for v1: `org-iso-mdoc`.** OpenID4VP material is kept at the bottom
for reference / future work.

## SessionTranscript shape (general)

```
SessionTranscript = [
    DeviceEngagementBytes,    ; null for DC-API
    EReaderKeyBytes,          ; null for DC-API
    Handover                  ; protocol-specific
]
```

Both null entries are CBOR `null` (major type 7, value 22), not omitted.

## Handover for `org-iso-mdoc` (ISO 18013-7 Annex C) ★

This is what we actually need for v1. ISO 18013-7 Annex C defines an "online" /
"browser" handover variant for the Digital Credentials API path. The
`google/mdoc-credential` library distinguishes two flavors:

- **`MdocHandover.BROWSER`** — used when the caller is a web origin. Binds the
  handover to `(origin, nonce, RP-HPKE-pubkey)`.
- **`MdocHandover.ANDROID`** — used when the caller is a native Android app. Binds
  to `(packageName, nonce, RP-HPKE-pubkey)`.

The library's API:

```kotlin
val hpke = MdocHpke(rpPublicKey)        // P-256 EC pubkey from the request
val sessionTranscript = when (handover) {
    BROWSER -> hpke.generateBrowserSessionTranscript(
                  nonce      = nonce,
                  publicKey  = rpPublicKey,
                  origin     = callingAppInfo.origin!!)
    ANDROID -> hpke.generateAndroidSessionTranscript(
                  nonce      = nonce,
                  publicKey  = rpPublicKey,
                  packageName= callingAppInfo.packageName)
}
```

The exact CBOR layout these helpers emit is what our DeviceAuth signature needs to
agree with. The library is archived (Oct 2024) but the CBOR it produces is what
Chrome's verifier-side logic checks against, so it's effectively normative for our
purpose.

**Strong recommendation: reuse the library.** Vendoring its handover/HPKE code
(it's small) is far less risky than re-deriving the byte layout from prose specs.

## Response encryption — `org-iso-mdoc` (HPKE) ★

Per ISO 18013-7 Annex C base mode:

- `KEM = DHKEM(P-256, HKDF-SHA256)`
- `KDF = HKDF-SHA256`
- `AEAD = AES-128-GCM`
- `info` = some fixed string defined by Annex C (the library knows it; we don't
  need to know it)
- AAD = the SessionTranscript bytes from above

Output is `(encapsulatedKey || ciphertext)` per the library's convention, returned
to the wallet as a single byte buffer:

```kotlin
val sealed = hpke.encrypt(
    plaintext  = deviceResponseCbor,
    aad        = sessionTranscript    // important: AAD binds the response to the request
)
```

Returned `responseJson` is base64url'd:

```json
{"protocol":"org-iso-mdoc","data":"<base64url(sealed)>"}
```

⚠ Whether `data` is a bare string or `{"response": "<b64u>"}` — public docs are
unclear. **Pin via the capture script** before M3.

## What the verifier does with our response (sanity check)

1. HPKE-opens the ciphertext with its own private key + the SessionTranscript AAD it
   computed locally.
2. CBOR-decodes the DeviceResponse.
3. For each Document: verifies `issuerAuth` (COSE_Sign1) — will report "untrusted
   issuer" because our cert is self-signed; that's fine.
4. Recomputes `valueDigests` over the IssuerSignedItems, checks each against the
   MSO's digest map.
5. Verifies `deviceSignature` over `["DeviceAuthentication", SessionTranscript,
   DocType, DeviceNameSpacesBytes]`. **This is the bit that fails if our handover
   bytes don't match.**

So the unique M3 failure mode is: everything decodes, issuer-untrusted is benign,
but device-auth fails → verifier rejects with a signature mismatch. The fix is
always "your SessionTranscript bytes don't match what the browser computed."

## OpenID4VP material — explicitly NOT used

For posterity: under the OID4VP profile path, this is where the JWE wrapping
and OpenID4VPDCAPIHandover would live. We do not implement either — see
`../CONTEXT.md` and `07-smart-checkin-on-mdoc.md` for why. The DC API + ISO mdoc + HPKE stack already
gives us authentication, integrity, and confidentiality without the second
encryption layer.

## Concrete unknowns to resolve before / during M3

1. ★ Exact bytes `MdocHpke.generateBrowserSessionTranscript` emits on the version of
   `google/mdoc-credential` we vendor — golden-file these in tests.
2. ★ Exact `data` envelope shape Chrome 141 emits for `org-iso-mdoc` (how the
   `DeviceRequest` and the RP HPKE pubkey are packaged into `providers[0].request`).
3. ★ Whether the wallet returns `data: "<b64u>"` or `data: {"response": "<b64u>"}`.
4. Whether Chrome enforces a specific HPKE AEAD (only AES-128-GCM? also AES-256-GCM?
   ChaCha?). Default to A128GCM until proven otherwise.
5. Whether the verifier checks issuer cert chain at all by default (most do; this
   determines whether we get a "decoded but untrusted" or a hard reject).

(1)-(3) are exactly what `capture/capture-dc-request.mjs` is designed to answer.
