# Profile B — `org-iso-mdoc` native (target profile)

This is **the profile we are targeting**. The wire shape is now pinned
against a real capture from `tools.mattrlabs.com/verify-credentials` —
Mattr's verifier UA-branches and emits `org-iso-mdoc` for Safari (macOS and
iOS) UAs. Captured 2026-04-30 via
`capture/probe-browser-branching.mjs --profile safari-macos --mode stub`,
promoted to fixture
`fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`.

The bytes in this doc are taken from that capture. Where Mattr's request
asks for an mDL doctype/namespace, we substitute our SMART Check-in values;
the envelope structure is identical.

## Identity

| | Value |
| --- | --- |
| DC API `protocol` | `"org-iso-mdoc"` (captured) |
| Underlying spec | ISO/IEC 18013-7 Annex C |
| mdoc `docType` | `"org.smarthealthit.checkin.1"` |
| mdoc namespace | `"org.smarthealthit.checkin"` |
| Requested element identifier | `"smart_health_checkin_response"` (stable; the wallet's response element) |
| SMART payload carrier | `ItemsRequest.requestInfo.smart_health_checkin` (tstr containing UTF-8 SMART request JSON) |
| Speculative on-the-shelf fallback (not planned) | dynamic element identifier `"shc1j.<base64url(JSON)>"`, sibling reserved `"shc1d.<base64url(deflate)>"` — only revisited if `requestInfo` is shown not to survive the platform round-trip |
| Recipient key location | `EncryptionInfo[1].recipientPublicKey` |
| Recipient key format | COSE_Key, EC2 / P-256, **no `alg`, no `kid`** |
| Response AEAD | AES-128-GCM (per ISO 18013-7 Annex C) |
| Response KEM/KDF | DHKEM(P-256, HKDF-SHA256) / HKDF-SHA256 (Annex C) |

## Request envelope (CAPTURED)

Argument to `navigator.credentials.get`:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [
      {
        "protocol": "org-iso-mdoc",
        "data": {
          "deviceRequest":   "<base64url(no-pad) of CBOR DeviceRequest bytes>",
          "encryptionInfo":  "<base64url(no-pad) of CBOR EncryptionInfo bytes>"
        }
      }
    ]
  },
  "signal": {}
}
```

- Field names confirmed: `deviceRequest`, `encryptionInfo` (camelCase).
- Both byte strings are **base64url without padding**.
- Top-level `signal: {}` is present in the captured arg (web-platform-style
  abort signal slot — empty in stub captures).

### `DeviceRequest` (CBOR, CAPTURED)

```
DeviceRequest = {
  "version":     "1.0",                                ; tstr
  "docRequests": [ DocRequest ]                        ; array (one entry)
}

DocRequest = {
  "itemsRequest": #6.24(bstr .cbor ItemsRequest)
  ; (no readerAuth — DC API path)
}
```

Captured size: 514 bytes outer, 469 bytes inner ItemsRequest. Hex / diag
siblings live next to the fixture.

### `ItemsRequest` (CBOR, CAPTURED)

```
ItemsRequest = {
  "docType":    tstr,                                  ; e.g. "org.smarthealthit.checkin.1"
  "nameSpaces": {
    tstr => { tstr => bool }                            ; namespace → element_id → intentToRetain
  }
  ; no requestInfo seen in capture
}
```

Mattr's actual ItemsRequest (capture, mDL):

```cbor-diag
{
  "docType": "org.iso.18013.5.1.mDL",
  "nameSpaces": {
    "org.iso.18013.5.1": {
      "family_name": false,
      "given_name":  false,
      ...
    },
    "org.iso.18013.5.1.aamva": {
      "sex":     false,
      "version": false,
      ...
    }
  }
}
```

Our SMART Check-in ItemsRequest — primary form (`requestInfo` carrier,
static element name):

```cbor-diag
{
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": false
    }
  },
  "requestInfo": {
    "smart_health_checkin": "<UTF-8 SMART request JSON, exact bytes>"
  }
}
```

The boolean is `intentToRetain` per ISO 18013-5 §8.3.2.1.2. The
`requestInfo` map is defined by ISO 18013-5 §8.3.2.1.2.1 as an open
extension point; verifiers MAY add custom keys. We register
`smart_health_checkin` for our payload.

Fallback form (only used when a platform API hides `requestInfo`):

```cbor-diag
{
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "shc1j.<base64url(SMART request JSON)>": false
    }
  }
}
```

The wallet handler MUST extract from `requestInfo.smart_health_checkin`
first; only if absent should it scan namespace keys for a `shc1j.` prefix
and decode it. Verifiers SHOULD send `requestInfo` in every request so the
matcher path is straightforward.

### `EncryptionInfo` (CBOR, CAPTURED)

```
EncryptionInfo = [
  "dcapi",                                             ; tstr literal
  {
    "nonce":              bstr (32 bytes captured),
    "recipientPublicKey": COSE_Key
  }
]
```

Captured nonce length: **32 bytes**. The COSE_Key has exactly four entries:

```
COSE_Key = {
   1: 2,                                ; kty = EC2
  -1: 1,                                ; crv = P-256
  -2: bstr (32 bytes, x coordinate),
  -3: bstr (32 bytes, y coordinate)
}
```

**No `alg` (3), no `kid` (2), no `use` semantics.** The "encryption" purpose
is implicit from being inside EncryptionInfo. Wallets must not require those
fields.

Captured EncryptionInfo size: 142 bytes.

## SMART payload location

The SMART request JSON travels in **`ItemsRequest.requestInfo["smart_health_checkin"]`** — a CBOR text string carrying the
exact UTF-8 bytes of the JSON object.

```ts
itemsRequest.requestInfo = {
  "smart_health_checkin": JSON.stringify(smartCheckinRequest),
};
```

This keeps the mdoc element identifier short and stable
(`smart_health_checkin_response`, the element the verifier expects in the
*response*), and pushes the dynamic ask into a documented extension field.
ISO 18013-5 §8.3.2.1.2.1 explicitly leaves `requestInfo` open for
verifier-defined keys.

### Fallback: dynamic element identifier (`shc1j.<b64u>`)

A wallet runtime may hide `requestInfo` from a matcher or handler (Android
Credential Manager could, in principle, only forward the namespace map). To
survive that case we keep the older convention as a documented fallback:

```ts
encodeDynamicElement(request) =
  "shc1j." + base64UrlEncode(JSON.stringify(request))
```

When the fallback is used, the element identifier itself carries the SMART
request JSON. The wallet matcher / handler checks for any namespace key
starting with `"shc1j."` and base64-decodes the suffix.

Reserved sibling: `"shc1d.<base64url(deflate(JSON))>"` for a future
DEFLATE-compressed variant (when request payloads grow past sensible plain
limits).

The fallback is **off by default**. Verifiers should send `requestInfo`;
wallets should extract from `requestInfo` first; the dynamic element trick
exists only as a contingency we want kept warm.

## Wallet matcher contract

Inputs (from `credman` host imports):

- `requestJson`: outer Credential Manager request.
- credentials blob: wallet-defined (small JSON describing offered creds).

### Host-side filtering: there isn't any (for our path)

The current AndroidX `registry-provider` path **does not pre-filter matcher
invocations by protocol**. The `RegisterCredentialsRequest(type, id,
credentials, matcher)` second arg is a registry primary key
("the unique id that identifies this registry, such that it won't be
overwritten by other different registries of the same `type`"), not a
protocol selector. The Play Services bridge
(`RegistryManagerProviderPlayServicesImpl`) forwards an empty
`protocolTypes = emptyList()` to GMS, and the typed
`OpenId4VpRegistry` subclass exposes no `protocolTypes` parameter either.

Practical consequence: **every registered DC matcher is invoked for every
`navigator.credentials.get({digital:…})` request of the matching `type`,
regardless of the verifier's protocol**. Each matcher receives the full
outer request JSON (including any other-protocol entries in a
multi-credential request) and decides for itself whether anything in there
is its problem.

That makes the matcher the only protocol filter — failing to self-filter
means the wallet's entry shows up for every DC API request, which is wrong
in a multi-wallet phone.

### Matcher steps

The matcher does **not** need to CBOR-decode. CBOR text strings encode
UTF-8 verbatim with a length prefix, so the literal bytes of our doctype
appear as a contiguous UTF-8 substring inside the base64-decoded
`deviceRequest`. Substring search is enough.

1. Substring-check the request bytes for `"org-iso-mdoc"`. **Required**
   self-filter; if absent, return without emitting anything.
2. Base64url-decode the value of any `deviceRequest` JSON string field.
3. Substring search those bytes for the literal UTF-8 of
   `"org.smarthealthit.checkin.1"` (our doctype). The doctype is
   distinctive enough that any other false positive is implausible.
4. Emit one `AddStringIdEntry`.

That's the whole thing. No CBOR parser, no integer-keyed map handling, no
tag-24 unwrapping, no namespace traversal. The matcher binary stays tiny,
its failure modes are bounded, and the WASI entropy / hashing trap from the
old `HashMap` story is irrelevant.

A handler / debug build that wants to display *which* SMART items the
verifier is asking for can do the full CBOR walk after the matcher fires,
in the host process where it has UI, time, and a real heap. Keep that code
path out of the WASM binary.

If we ever ship the speculative `shc1j.` fallback (we don't plan to),
matcher logic stays the same — the doctype substring is still present;
the dynamic element id only changes what the *handler* reads to extract
the SMART payload, not what the matcher inspects to decide eligibility.

## SessionTranscript

Per ISO 18013-7 Annex C "online presentation". The handover is `["dcapi",
deviceEngagementHash]`. **Bytes still need a real wallet response to pin
end-to-end** — capture covers the request, not the response, so the exact
hash input layout is the next thing to verify.

Working derivation (best public-spec reading; verify against
`google/mdoc-credential` source or interop):

```
SessionTranscript = [
  null,                                                ; DeviceEngagementBytes
  null,                                                ; EReaderKeyBytes
  ["dcapi", deviceEngagementHash]                      ; Handover
]

deviceEngagementHash = sha256(
  cbor.encode([
    nonce,                                              ; bstr 32 (from EncryptionInfo)
    recipientPublicKey                                  ; CBOR-encoded COSE_Key (canonical bytes)
  ])
)
```

Open question: does the hash input use the **canonicalized re-encoded
COSE_Key bytes**, or a slice of the original `EncryptionInfo` bytes? Pin
this with a fake-wallet round-trip test.

## DeviceResponse

Identical to Profile A structurally:

- One Document with `docType = "org.smarthealthit.checkin.1"`.
- One IssuerSignedItem in namespace `org.smarthealthit.checkin`.
- `elementIdentifier` = same `shc1j.<b64u>` string as the request key.
- `elementValue` = SMART response JSON (tstr).
- Empty DeviceSigned namespaces (`#6.24(bstr .cbor {})`).
- `deviceSignature` COSE_Sign1 over the **`["dcapi", hash]` SessionTranscript**.

The mdoc layer is byte-identical to Profile A *except* for which
SessionTranscript bytes `deviceSignature` signs over.

## Response transport (HPKE)

Per ISO 18013-7 Annex C base mode:

```
KEM   = DHKEM(P-256, HKDF-SHA256)
KDF   = HKDF-SHA256
AEAD  = AES-128-GCM
info  = <Annex C-defined fixed string>     ; pin via spec or real capture
aad   = SessionTranscript bytes
```

Sealing:

```
sealed = HPKE.seal(
  recipient_pubkey = recipientPublicKey  // COSE_Key from EncryptionInfo, decoded to raw EC point
  plaintext        = DeviceResponse CBOR bytes
  aad              = SessionTranscript bytes
  info             = <Annex C info>
)
```

`sealed` is the standard HPKE output: encapsulated key (65 bytes for
DHKEM-P256) || ciphertext || tag (16 bytes for AES-128-GCM).

DC API result returned to the RP page:

```json
{
  "protocol": "org-iso-mdoc",
  "data": "<base64url(sealed)>"
}
```

(The bare-string form is standard Annex C; an alternate
`{ data: { response: "<b64u>" } }` envelope appears in some drafts. Capture
a real wallet response before locking this — at request time we know the
shape, at response time we don't yet.)

## RP decoder

1. `await navigator.credentials.get(arg)` returns a `DigitalCredential`.
2. Verify `credential.protocol === "org-iso-mdoc"`.
3. Extract sealed bytes from `data` (string-form or `data.response`-form).
4. Recompute SessionTranscript from retained `(nonce, RPpubKeyCOSE)`.
5. HPKE.open with retained RP private key + SessionTranscript as AAD →
   DeviceResponse CBOR.
6. CBOR-decode → walk to one Document.
7. Verify `deviceSignature` over the `["dcapi", hash]` SessionTranscript.
8. Verify `issuerAuth` (self-signed cert chain → "issuer untrusted, signature
   verified" acceptable).
9. SHA-256 the tag-24 IssuerSignedItem bytes; compare against
   `MSO.valueDigests`.
10. Read `elementValue` → SMART response JSON.

## Trust properties

| Concern | Mechanism |
| --- | --- |
| Verifier identity | `callingAppInfo.origin` shown in wallet UI (browser-supplied) |
| Request authenticity (cryptographic) | None at the org-iso-mdoc layer; wallet trusts the browser-mediated channel |
| Response confidentiality | HPKE base mode under RP's ephemeral P-256 public key |
| Response integrity (cryptographic) | `deviceSignature` over `["dcapi", hash]` Handover binds (nonce, RPpubKeyCOSE) into the wallet's signature |
| Origin binding | **Not** in the SessionTranscript hash. Origin is bound only at the DC API delivery layer (browser shows it; user sees it). |
| Replay resistance | Per-request 32-byte nonce + per-page RP keypair → unique DeviceEngagementHash |

The fact that the Annex C handover **does not include origin** is a real
semantic difference from Profile A's `OpenID4VPDCAPIHandover`. Verifiers
that want origin-bound deviceSignature must use Profile A. For our
SMART Check-in harness, origin trust comes from the browser-mediated DC API
channel + the user's consent on the wallet UI showing the origin.

## Risks & open verifications

What's now **resolved** by the capture:

- ✅ `data.deviceRequest` field name (camelCase).
- ✅ `data.encryptionInfo` field name (camelCase).
- ✅ Base64url no-padding encoding of both CBOR blobs.
- ✅ `DeviceRequest` outer CBOR shape.
- ✅ `ItemsRequest` CBOR shape under tag-24 wrap.
- ✅ `EncryptionInfo` is an **array** `["dcapi", { nonce, recipientPublicKey }]`,
  not a map or wrapped struct.
- ✅ `nonce` is a 32-byte `bstr`.
- ✅ `recipientPublicKey` is a minimal COSE_Key (4 fields: kty, crv, x, y),
  no `alg`, no `kid`.

What's **still unverified**:

1. **Does `requestInfo` survive the platform round-trip?** The capture is
   request-side only and Mattr does not include `requestInfo`, so we don't
   yet know whether Chrome / Safari / Android Credential Manager strip or
   pass `requestInfo` through to the wallet. **This is the load-bearing
   open question for the new design.** Verify by running a self-issued
   request through real Chrome and Android handlers; if `requestInfo` is
   hidden, switch the active path to the `shc1j.` fallback.
2. **`["dcapi", hash]` Handover hash input.** Whether the hashed CBOR uses
   the captured EncryptionInfo bytes verbatim, a re-canonicalized COSE_Key,
   or just the `(nonce, COSE_Key)` pair. Three plausible variants — pin via
   fake-wallet round-trip.
3. **HPKE `info` string.** Annex C defines a specific value; not yet pinned.
4. **HPKE output packing**. Standard HPKE concatenates encapsulated key +
   ciphertext + tag, but Annex C may specify a different layout. Confirm
   with a real wallet response.
5. **Response `data` shape**. Bare string vs `{response: "<b64u>"}`. RP
   decoder accepts both; a real wallet response will resolve.
6. **Tag-24 inner bstr length encoding** for the wallet's
   `IssuerSignedItemBytes`. Mattr's request uses `0x59 0x01 0xd5` (2-byte
   length) for a 469-byte payload; we should match that style for ≥256-byte
   tag-24 wraps so MSO digest computation is reproducible.
7. **WebKit (real Safari) parity**. The capture used Chromium with a Safari
   UA spoof. Verify against real WebKit on macOS/iOS — Mattr branches on
   UA, but the actual Safari implementation may differ from what the
   spoofed Chromium does.
8. **Self-signed issuer behavior** — assume "issuer untrusted, signature
   verified" non-fatal; confirm at first end-to-end.
9. **`requestInfo` length limits** in Chrome / Safari / Android. tstrs have
   no spec cap; practical platform caps unknown. The dynamic-element
   fallback shifts the limit (and its risk) to the namespace key length
   instead.

## Implementation deltas vs the current protocol library

Current `rp-web/src/protocol/index.ts` implements Profile A (openid4vp + JWE
+ OpenID4VPDCAPIHandover). To target Profile B we need:

1. `buildOrgIsoMdocDcApiRequest(request)` — emits the captured `{deviceRequest,
   encryptionInfo}` shape. Generates a fresh ECDH P-256 keypair, packages
   the public point as a 4-field COSE_Key, generates a 32-byte nonce.
2. CBOR encoder needs additions: maps (keyed by string and by negative
   integer), bool, integers including negative ints.
3. `buildIsoMdocSessionTranscript({nonce, recipientPublicKeyCose})` — emits
   the `["dcapi", sha256(...)]` form (locking the inner-encoding choice from
   risk #1 once confirmed).
4. `decryptIsoMdocResponse({sealedBytes, recipientPrivateKey, sessionTranscript})`
   — HPKE open. Either WebCrypto + handcrafted DHKEM/HKDF, or pull in
   `@hpke/core` + `@hpke/dhkem-p256`.
5. Response handling: the wallet returns raw HPKE bytes (no `vp_token`
   wrapping), so the JWE/AuthorizationResponse code path is not used.

Keeping the openid4vp path alongside is cheap (couple hundred lines) and
useful for capturing test artifacts from openid4vp-only verifiers.

## Captured fixture references

- `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`
  - `manifest.json`, `notes.md`
  - `navigator-credentials-get.arg.json` — verbatim DC API arg
  - `device-request.cbor` (+ `.hex`, `.diag`) — the outer `DeviceRequest`
  - `items-request.cbor` (+ `.hex`, `.diag`) — the inner tag-24 `ItemsRequest`
  - `encryption-info.cbor` (+ `.hex`, `.diag`) — the `["dcapi", {…}]` array
- iOS Safari capture differs only in the per-request nonce + ephemeral
  recipient public key:
  `capture/browser-branching/2026-05-01T00-08-07-725Z-safari-ios-stub/`.

## References

- ISO/IEC 18013-7 Annex C (paywalled).
- W3C-FedID closed protocol enum: see `research/01-dc-api-overview.md`.
- `google/mdoc-credential` (archived 2024-10): canonical reference for the
  Annex C handover/HPKE bytes — pin against this source.
- Cross-profile differences summary: `profiles/README.md`.
- Live capture script: `capture/probe-browser-branching.mjs`.
