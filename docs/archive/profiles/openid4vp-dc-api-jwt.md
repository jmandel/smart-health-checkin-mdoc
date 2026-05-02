# Profile A — `openid4vp` + `dc_api.jwt` + `mso_mdoc`

This is the profile **Chrome 141+** verifiers emit today, captured verbatim
from `tools.mattrlabs.com/verify-credentials` when called with a Chrome UA.
The protocol library in `rp-web/src/protocol/index.ts` implements this path.

Note: Mattr **UA-branches**. Safari (macOS + iOS) UAs receive
[Profile B (`org-iso-mdoc`)](org-iso-mdoc.initial-capture-profile.md) instead. We target Profile B
as the primary path; Profile A is kept because Chrome verifiers ship it
today and capturing/round-tripping it is a useful diagnostic baseline.

## Identity

| | Value |
| --- | --- |
| DC API `protocol` | `"openid4vp"` |
| OpenID4VP `response_type` | `"vp_token"` |
| OpenID4VP `response_mode` | `"dc_api.jwt"` |
| DCQL `format` | `"mso_mdoc"` |
| mdoc `docType` | `"org.smarthealthit.checkin.1"` |
| mdoc namespace | `"org.smarthealthit.checkin"` |
| Element identifier prefix | `"shc1j."` (base64url of compact UTF-8 JSON) |
| Reserved element prefix | `"shc1d."` (deflate variant; not yet wired) |
| Recipient key location | `data.client_metadata.jwks.keys[0]` |
| Recipient key alg | `ECDH-ES` |
| Recipient key crv | `P-256` |
| Response AEAD | `A128GCM` |

## Request envelope

Argument to `navigator.credentials.get`:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [
      {
        "protocol": "openid4vp",
        "data": {
          "response_type": "vp_token",
          "response_mode": "dc_api.jwt",
          "nonce": "<base64url(random 32 bytes)>",
          "dcql_query": {
            "credentials": [
              {
                "id": "checkin",
                "format": "mso_mdoc",
                "meta": {
                  "doctype_value": "org.smarthealthit.checkin.1"
                },
                "claims": [
                  {
                    "id": "checkin_request",
                    "intent_to_retain": false,
                    "path": [
                      "org.smarthealthit.checkin",
                      "shc1j.<base64url-of-SMART-request-JSON>"
                    ]
                  }
                ]
              }
            ]
          },
          "client_metadata": {
            "authorization_encrypted_response_alg": "ECDH-ES",
            "authorization_encrypted_response_enc": "A128GCM",
            "jwks": {
              "keys": [
                {
                  "kty": "EC",
                  "crv": "P-256",
                  "x": "<base64url>",
                  "y": "<base64url>",
                  "use": "enc",
                  "alg": "ECDH-ES",
                  "kid": "<uuid>"
                }
              ]
            }
          }
        }
      }
    ]
  }
}
```

Observed at 2026-04-30T21:17:45Z from Mattr's verifier (mDL doctype). The
above is structurally identical with our doctype + dynamic element
substituted.

## SMART payload location

The SMART request JSON travels as **`claims[0].path[1]`** — i.e., the mdoc
element identifier itself.

Encoder (in `protocol/index.ts`):

```ts
encodeDynamicElement(request) =
  "shc1j." + base64UrlEncode(JSON.stringify(request))
```

Decoder is the inverse. JSON is *compact* (no pretty-printing) so the string
is stable across UI representations.

A typical encoded element is 1–10 KB; for large inline Questionnaires it can
exceed 50 KB. mdoc spec places no cap on element identifier length (it's a
CBOR `tstr`), but Chrome's verifier-side parser limits are unverified — see
*Risks* §3.

## Wallet matcher contract

Inputs (from `credman` host imports):

- `requestJson`: outer Credential Manager request as UTF-8 JSON.
- credentials blob: wallet-defined; we use a small JSON describing what the
  wallet can offer (presence of a SMART Check-in credential).

Required steps:

1. Parse `requestJson` (top level: `{providers: [{protocol, request}]}` for
   IdentityCredentialManager, or `{requests: [{protocol, data}]}` for
   modern RegistryManager — the matcher should accept either shape).
2. Find an entry with `protocol == "openid4vp"`.
3. Parse `data` (a JSON object, or a string — accept either).
4. Find a `dcql_query.credentials[*]` with:
   - `format == "mso_mdoc"`,
   - `meta.doctype_value == "org.smarthealthit.checkin.1"`.
5. Find a `claims[*]` with:
   - `path[0] == "org.smarthealthit.checkin"`,
   - `path[1]` starts with `"shc1j."`.
6. Emit one `AddStringIdEntry` for the SMART Check-in credential.

Optional (debug builds only): base64url-decode `path[1]` after the prefix and
add `AddFieldForStringIdEntry` rows summarizing requested SMART items.

The matcher does not need to decode the full SMART request JSON to decide
eligibility; the prefix check is sufficient.

## SessionTranscript

Per OpenID4VP draft 24+ §A.3 (DC API handover). Bytes pinned by golden tests in
`rp-web/src/protocol/index.test.ts`.

```
SessionTranscript = [
  null,                                                ; DeviceEngagementBytes
  null,                                                ; EReaderKeyBytes
  ["OpenID4VPDCAPIHandover", sha256(handoverInfo)]     ; Handover
]

handoverInfo = cbor.encode([
  origin,                                              ; tstr; calling web origin
  nonce,                                               ; tstr; the same nonce in the request
  jwk_thumbprint_sha256                                ; bstr; sha256 of canonical JWK
])

jwk_thumbprint_sha256 = sha256(
  utf8(
    JSON.stringify({ crv, kty, x, y })   ; required-members-only, sorted alpha (RFC 7638)
  )
)
```

Note `nonce` is the **base64url string** as it appears in the request, not the
raw 32 bytes. Both the verifier and the wallet stringify it the same way.

`OpenID4VPDCAPIHandover` differs byte-for-byte from the older Annex C
`BrowserHandover` — a wallet that signs against Annex C bytes will fail
deviceSignature verification on this profile.

## DeviceResponse

```
DeviceResponse = {
  "version":   "1.0",
  "documents": [ Document ],
  "status":    0
}

Document = {
  "docType":      "org.smarthealthit.checkin.1",
  "issuerSigned": IssuerSigned,
  "deviceSigned": DeviceSigned
}

IssuerSigned.nameSpaces = {
  "org.smarthealthit.checkin": [
    #6.24(bstr .cbor IssuerSignedItem)
  ]
}

IssuerSignedItem = {
  "digestID":          0,
  "random":            <bstr ≥ 16 bytes>,
  "elementIdentifier": "shc1j.<same b64u as request>",
  "elementValue":      "<SMART response JSON tstr>"
}
```

`DeviceSigned.nameSpaces` = `#6.24(bstr .cbor {})` (empty map).

`deviceAuth.deviceSignature` = COSE_Sign1 over:

```
#6.24(bstr .cbor [
  "DeviceAuthentication",
  SessionTranscript,             ; the OpenID4VPDCAPIHandover form above
  "org.smarthealthit.checkin.1",
  DeviceNameSpacesBytes          ; the empty-map tag-24 above
])
```

`issuerAuth` is COSE_Sign1 with self-signed P-256 cert (one-element x5chain).

Reference fixture: `fixtures/responses/pymdoc-minimal/` — a real mdoc Document
issued by pyMDOC-CBOR with a `shc1j.`-prefixed element. `value-digest-input.cbor`
is the deterministic tag-24 issuer-item bytes; `document.cbor` includes
nondeterministic ECDSA signature bytes.

## Response transport (compact JWE)

Plaintext (JSON, UTF-8):

```json
{
  "vp_token": {
    "checkin": [ "<base64url(DeviceResponse CBOR bytes)>" ]
  },
  "state": "<optional>"
}
```

JWE protected header:

```json
{
  "alg": "ECDH-ES",
  "enc": "A128GCM",
  "epk": { "kty":"EC", "crv":"P-256", "x":"...", "y":"..." }
}
```

CEK derivation (NIST SP 800-56A §5.8.2.1.1, JOSE convention):

```
Z = ECDH(walletEphPriv, RPpub)                    ; 32 bytes
OtherInfo =
    uint32be(7) || utf8("A128GCM")                ; AlgorithmID
  || uint32be(0) || ""                            ; PartyUInfo (empty)
  || uint32be(0) || ""                            ; PartyVInfo (empty)
  || uint32be(128)                                ; SuppPubInfo (keylen bits)
DerivedKeyingMaterial = sha256(uint32be(1) || Z || OtherInfo)
CEK = first 16 bytes of DerivedKeyingMaterial
```

AES-128-GCM:

```
ciphertext || tag = AES-128-GCM(
  plaintext,
  key = CEK,
  iv = random 12 bytes,
  aad = utf8(base64url(protectedHeaderJSON))
)
```

Compact serialization (5 parts, single `.`-separated):

```
b64u(protectedHeaderJSON) "." "" "." b64u(iv) "." b64u(ciphertext) "." b64u(tag)
```

The empty second part is correct for `ECDH-ES` direct mode (no encrypted CEK).

DC API result returned to the RP page (**unverified** — needs a Chrome capture
of a real wallet response):

```json
{
  "protocol": "openid4vp",
  "data": { "response": "<compact JWE above>" }
}
```

It is plausible that Chrome instead delivers `data: "<compact JWE>"` (bare
string, no wrapper). See *Risks* §1.

## RP decoder

1. `await navigator.credentials.get(arg)` returns a `DigitalCredential`.
2. Verify `credential.protocol === "openid4vp"`.
3. Extract compact JWE — try `data.response` first; fall back to `data` as
   string if `data` isn't an object.
4. Split on `.` (5 parts), decode `protectedHeader` JSON, validate
   `alg=ECDH-ES`, `enc=A128GCM`.
5. Import `epk` as ECDH P-256 public key, run ECDH with retained RP private
   key, run NIST SP 800-56A KDF (above) to recover CEK.
6. AES-128-GCM decrypt → JSON → `AuthorizationResponse`.
7. `b64u_decode(vp_token["checkin"][0])` → DeviceResponse CBOR bytes.
8. CBOR-decode → walk to one Document.
9. Recompute SessionTranscript from the same `(origin, nonce, RPjwk)` retained
   from request build; verify `deviceSignature` COSE_Sign1.
10. Verify `issuerAuth` COSE_Sign1 (self-signed cert chain → "issuer
    untrusted, signature OK" is acceptable).
11. SHA-256 the tag-24 IssuerSignedItem bytes; compare against the digest in
    `MSO.valueDigests[namespace][digestID]`.
12. Read the IssuerSignedItem's `elementValue` → SMART response JSON.

## Trust properties

| Concern | Mechanism |
| --- | --- |
| Verifier identity | `callingAppInfo.origin` (browser-supplied), shown to user |
| Request integrity at the local channel | Browser/Credential Manager same-device delivery; RP origin is bound by browser into request routing |
| Request authenticity (cryptographic) | None at the OpenID4VP layer in this profile (no signed Request Object). The SMART request JSON is treated as application payload. |
| Response confidentiality | Compact JWE under RP's ephemeral ECDH-ES public key |
| Response integrity (cryptographic) | `deviceSignature` COSE_Sign1 over `OpenID4VPDCAPIHandover` SessionTranscript binds (origin, nonce, RPjwk) into the wallet's signature |
| Replay resistance | Per-request 32-byte nonce + per-page ephemeral RP keypair |

The "request not separately signed" is intentional. Any party that can mount
the call from `https://verifier.example` is, by browser definition, that
origin. We surface origin to the user and rely on the same-device channel.

## Risks & open verifications

1. **Chrome's response `data` shape**. The capture is for the request side
   only. We do not yet have a wallet→RP capture confirming whether Chrome
   delivers `{ data: { response: "<jwe>" } }` or `{ data: "<jwe>" }`. The RP
   decoder accepts both; until a real capture exists, this is an assumption.
2. **Chrome's JWE form**. We emit *compact* JWE. Chrome's verifier-side
   tolerance for flattened-JSON JWE is unknown. Compact is the safest bet.
3. **Element identifier length**. `shc1j.<b64u>` strings can be 1–50+ KB.
   Chrome's parser may have a soft or hard cap. Untested past ~1 KB in real
   captures. **Mitigation candidate**: implement the reserved `shc1d.<b64u>`
   deflate variant before relying on inline Questionnaires.
4. **JWK thumbprint canonicalization**. We use RFC 7638 (sorted required
   members only). Lib goldens match the OpenID4VP draft examples; assumed
   identical to what Chrome computes when verifying our `deviceSignature`.
5. **ECDH-ES KDF byte layout**. Lib follows JOSE convention (NIST SP 800-56A
   §5.8.2.1.1, AlgorithmID = `"A128GCM"` length-prefixed, empty Apu/Apv,
   SuppPubInfo = 128-bit big-endian keylen). Lib tests against published JOSE
   vectors. Untested against Chrome end-to-end.
6. **Self-signed issuer**. We assume Mattr's verifier surfaces "issuer
   untrusted, signature verified" rather than hard-rejecting. Confirm with a
   live wallet response.
7. **`nonce` stringification**. We treat the nonce as the exact base64url
   string from the request when computing handoverInfo. If Chrome (verifier
   side) instead uses raw bytes, deviceSignature will mismatch. Lib goldens
   match the OpenID4VP draft examples (string form); mismatch unlikely but
   untested at the wallet boundary.
8. **`mediation: "required"`**. This is a Web Authentication-style hint; not
   strictly required but matches the captured shape. Some implementations may
   ignore it.
9. **Wallet-emitted `epk`**. The wallet generates its own ephemeral keypair
   for the JWE response (DC-API JWT response mode requires the wallet to
   supply an `epk` in the JWE protected header). Lib's `encryptDcApiJwtResponse`
   does this; an Android implementation must do the same.
10. **DCQL credential `id`**. Lib emits `"checkin"`; the Mattr capture used
    `"0-org.iso.18013.5.1.mDL"` (a `<n>-<doctype>` convention). Either form
    appears valid; lib's choice is arbitrary.

## References

- W3C Digital Credentials API: https://w3c-fedid.github.io/digital-credentials/
- OpenID4VP draft 24+: https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html
- DCQL `mso_mdoc` claim path: §7.2 of the same draft.
- Protocol lib: `rp-web/src/protocol/index.ts`.
- Golden tests: `rp-web/src/protocol/index.test.ts`.
- Reference DeviceResponse fixture: `fixtures/responses/pymdoc-minimal/`.
