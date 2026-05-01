# Historical open questions: OpenID4VP/DC API `mso_mdoc` wrapper

Status: not the active implementation path. Mattr's browser-branching behavior
showed Chrome identity using OpenID4VP while Safari identities use direct
`org-iso-mdoc`. The active plan now targets direct `org-iso-mdoc`; this file is
kept for provenance and possible fallback work.

This file tracks only the wrapper layer around the mdoc:

```text
navigator.credentials.get
  protocol: "openid4vp"
  data.response_mode: "dc_api.jwt"
  data.dcql_query.credentials[].format: "mso_mdoc"
  vp_token.checkin[0] = base64url(DeviceResponse CBOR)
```

The mdoc builder itself is tracked elsewhere.

## 1. Android wallet return envelope ★

Question: what exact JSON should the Android handler pass to
`DigitalCredential(...)` / `PendingIntentHandler.setGetCredentialResponse(...)`
for OpenID4VP over DC API?

Candidates:

```json
{"protocol":"openid4vp","data":{"response":"<compact-jwe>"}}
```

```json
{"protocol":"openid4vp","data":"<compact-jwe>"}
```

```json
{"protocol":"openid4vp","data":{"response":"<compact-jwe>","response_code":null}}
```

Why this matters: the browser promise must resolve to the verifier-visible shape
that OpenID4VP calls `dc_api.jwt`. Mattr tells us request shape, not provider
return shape.

How to resolve:

- Inspect official Android Digital Credential holder docs and samples.
- Inspect Chrome/Web Platform tests for `openid4vp` response handling.
- Build a minimal fake Android provider that returns each candidate envelope and
  record what browser JS receives.
- If a known wallet exists, capture its returned `DigitalCredential` JSON.

Expected output:

- One canonical `makeDigitalCredentialResponseJson(jwe)` helper.
- A fixture:

  ```text
  fixtures/captures/android-openid4vp-response-envelope/
    wallet-response.digital-credential.json
    browser-result.json
    notes.md
  ```

## 2. Protocol identifier string ★

Question: does current Chrome/Android Credential Manager expect:

```text
openid4vp
```

or one of the spec-final enum-style names:

```text
openid4vp-v1-unsigned
openid4vp-v1-signed
openid4vp-v1-multisigned
```

Our Mattr capture used `protocol: "openid4vp"`. Specs and platform docs have
shifted over time.

How to resolve:

- Capture from current public verifiers.
- Test all candidate strings in RP web against Android Credential Manager.
- Inspect Chrome source or WPT cases for currently accepted strings.

Expected output:

- `PROTOCOL_ID` constant pinned with source/date.
- Compatibility notes if Chrome accepts aliases.

## 3. Request object pass-through to matcher/handler ★

Question: what exact request JSON does Android expose to the WASM matcher and to
the handler activity?

Need to know whether it is:

- the original browser argument;
- a `providers[]` wrapper;
- stringified nested `request`;
- a filtered OpenID4VP object;
- something else.

How to resolve:

- Add a diagnostic matcher that emits summarized fields with
  `AddFieldForStringIdEntry`.
- Add handler logging/export of raw `ProviderGetCredentialRequest`.
- Compare with `navigator-credentials-get.arg.json`.

Expected output:

- `fixtures/captures/android-request-as-seen/`
- Parser helpers for matcher and handler based on the real shape.

## 4. Dynamic claim length limits ★

Question: how large can `claims[].path[1] = "shc1j.<payload>"` be before Chrome,
Credential Manager, matcher, Android intents, or wallet UI break?

Probe decoded SMART request sizes:

- 512 B
- 2 KB
- 8 KB
- 32 KB
- 128 KB

How to resolve:

- Generate fixtures with deterministic `shc1j` payloads.
- Run through browser, matcher, handler, and response.
- Record failures by layer.

Expected output:

- Recommended v1 max payload size.
- Decision on whether to implement reserved `shc1d`.

## 5. JWE header requirements

Question: are these headers sufficient for `dc_api.jwt`?

```json
{
  "alg": "ECDH-ES",
  "enc": "A128GCM",
  "epk": {"kty":"EC","crv":"P-256","x":"...","y":"..."}
}
```

Or do real verifiers expect/require `kid`, `apu`, `apv`, `typ`, or a different
HPKE/JOSE integrated mode in newer OpenID4VP drafts?

How to resolve:

- Compare against OpenID4VP 1.0 vs 1.1 text.
- Test decrypt with common verifier libraries.
- Inspect Mattr/OpenID examples where available.

Expected output:

- Pinned JWE profile for v1.
- Tests for any required protected header fields.

## 6. `client_metadata` minimum viable fields

Question: should our RP request include only encryption metadata, or also:

```json
{
  "vp_formats_supported": {
    "mso_mdoc": {
      "issuerauth_alg_values": [-9],
      "deviceauth_alg_values": [-9]
    }
  }
}
```

The spec defines these metadata fields for mdoc. Some wallets may require them
for matching or response construction.

How to resolve:

- Test request with and without `vp_formats_supported`.
- Inspect wallet samples and conformance vectors.

Expected output:

- RP request builder default metadata.

## 7. `state` handling

Question: should the RP include `state`, and if included must the wallet echo it
inside the encrypted authorization response?

Current plan: omit `state` unless a verifier fixture requires it.

How to resolve:

- Check OpenID4VP DC API request parameter set.
- Test whether Android/Chrome preserves it.

Expected output:

- `state` policy in request/response helpers.

## 8. Error and cancellation response shape

Question: on user decline or malformed dynamic claim, should wallet:

- cancel the Android activity;
- return an encrypted OpenID4VP error response;
- return platform error only?

How to resolve:

- Inspect Credential Manager error behavior.
- Inspect OpenID4VP rules for `dc_api.jwt` error responses.
- Test browser-visible behavior for both cancel and encrypted error.

Expected output:

- `makeOpenId4VpErrorResponse(...)` helper or explicit decision to use platform
  cancellation for v1.

## 9. DeviceResponse-to-DCQL credential id mapping

Question: for response:

```json
{"vp_token":{"checkin":["<DeviceResponse>"]}}
```

must the key be exactly `dcql_query.credentials[0].id`, and what happens if
multiple SMART Check-in credential queries are present?

Current plan: one credential query with id `checkin`.

How to resolve:

- Confirm in OpenID4VP text and verifier libraries.
- Add negative tests for mismatched id.

Expected output:

- Parser rejects/flags mismatched credential ids.

## 10. Conformance vector sources

Question: which upstream vectors should be mirrored into fixtures?

Known sources:

- `openid/OpenID4VP` markdown examples for:
  - JWK thumbprint;
  - `OpenID4VPDCAPIHandoverInfo`;
  - `OpenID4VPDCAPIHandover`;
  - SessionTranscript.
- Public verifier captures such as Mattr for request shape.

Need more:

- encrypted `dc_api.jwt` examples;
- complete `mso_mdoc` VP Token examples;
- Android wallet/provider samples.

Expected output:

- `fixtures/openid4vp/` with source URLs and dates.

## 11. Verifier page browser branching

Question: does a public verifier such as Mattr build a different
`navigator.credentials.get` argument in Chrome vs Safari?

Status: confirmed for Mattr on 2026-04-30 using Chromium/CDP with browser
identity profiles:

- Chrome identity emitted `protocol: "openid4vp"` with
  `response_mode: "dc_api.jwt"` and DCQL `format: "mso_mdoc"`.
- Safari macOS and Safari iOS identities emitted `protocol: "org-iso-mdoc"` with
  `{deviceRequest, encryptionInfo}`.
- Decoding the Safari-style `deviceRequest` showed the same mDL request
  semantics: `docType = "org.iso.18013.5.1.mDL"` with 25 requested elements
  across `org.iso.18013.5.1` and `org.iso.18013.5.1.aamva`.

Capture scratch outputs:

```text
capture/browser-branching/2026-05-01T00-08-07-664Z-chrome-stub/
capture/browser-branching/2026-05-01T00-08-07-703Z-safari-macos-stub/
capture/browser-branching/2026-05-01T00-08-07-725Z-safari-ios-stub/
```

Important caveat: these Safari captures are Chromium with Safari-like
user-agent/device settings. They confirm Mattr has a browser-identity branch;
they do not prove real Safari/WebKit runtime behavior.

This matters because a Chrome capture may reflect Chrome-specific feature
detection, protocol naming, or response-mode selection. Safari/WebKit could see
or trigger a different code path.

How to resolve:

- Use `capture/probe-browser-branching.mjs` with `chrome`, `safari-macos`, and
  `safari-ios` profiles to detect verifier-page user-agent branching.
- Use `capture/manual-safari-hook.js` in real Safari/Web Inspector to capture
  actual WebKit behavior.
- Store paired outputs under `fixtures/captures/browser-branching/` once we have
  clean captures worth promoting out of scratch space.

Expected output:

- A normalized diff of Chrome vs Safari request arguments.
- A clear note distinguishing "Chromium with Safari UA" from real Safari.
