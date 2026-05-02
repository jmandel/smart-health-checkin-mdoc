# 2026-04-30 — Mattr verifier (Safari UA) emits org-iso-mdoc

## Setup

```sh
node tools/capture/probe-browser-branching.mjs --profile safari-macos --mode stub
```

## What we observed

- Mattr's `tools.mattrlabs.com/verify-credentials` UA-branches.
- Chrome 141 UA → `protocol: "openid4vp"`, response_mode `dc_api.jwt`,
  `mso_mdoc` DCQL.
- Safari 26 UA (macOS) → `protocol: "org-iso-mdoc"`, raw mdoc DeviceRequest +
  EncryptionInfo bytes.
- iOS Safari UA → identical to macOS Safari.

## Field names confirmed

- `data.deviceRequest` — base64url (no padding) CBOR DeviceRequest.
- `data.encryptionInfo` — base64url (no padding) CBOR EncryptionInfo.

## EncryptionInfo array

```
[ "dcapi",
  { "nonce": <bstr 32>,
    "recipientPublicKey": <COSE_Key>  // EC2 / P-256, no alg, no kid
  } ]
```

`recipientPublicKey` COSE_Key has only kty (1=EC2), crv (-1=P-256), x (-2),
y (-3). No `alg` (3), no `kid` (2), no `use` semantics. The `enc` purpose
is implicit from being inside EncryptionInfo.

## Caveat

This was captured under a UA spoof; we have not yet verified that real
WebKit (Safari) emits the same bytes. The probe used Chromium with a Safari
UA string.
