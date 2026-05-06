# `sdk-web-wallet/` — web-wallet shim (side surface)

This is a **side surface**, not part of the rp-web SDK barrel
(`src/sdk/index.ts`). It is a developer/demo helper that lets a verifier
mediate a W3C Digital Credentials request through a web app instead of the
platform `navigator.credentials.get` UI. The reference demo currently handles
`org-iso-mdoc` SMART Health Check-in requests. The demo happens to use a
same-origin wallet URL, but the wallet-side session model is not
same-origin-only: the inbound request's browser-stamped `MessageEvent.origin`
is displayed to the user and then used for response `targetOrigin` and, for
mdoc, transcript binding.
See [`WALLET-INTEGRATION-PROTOCOL.md`](WALLET-INTEGRATION-PROTOCOL.md) for the
short listen/respond contract.

It is positioned the same way as `kiosk-session.ts`: a deployment helper for
this repo's demos, not part of the v1.0 wire protocol.

## What it is

Three things:

1. `createWebWalletCredentialGetter({ walletUrl })` — a `CredentialGetter`
   that opens/navigates a script-created wallet tab/window, posts the
   verifier's credential request options to it, waits for a credential response,
   and returns that credential object. The transport is protocol-neutral across
   Digital Credentials protocols; drop it into the existing
   `requestCredentialWithAuthority({ getCredential })` seam for this demo.

2. `configureWebWallets({ wallets })` — a web-wallet-only configuration helper
   that returns explicit wallet handles. Each handle has
   `credentials.get(options)` plus `credentials.openPopup()` /
   `credentials.createGetter({ popup })` for gesture-preserving React/UI
   integration. It does **not** know about Platform Wallet and does **not**
   patch `navigator.credentials.get`.

3. `buildWebWalletDcapiResponse({ ... })` — a wallet-side packager that
   reads the `deviceRequest`/`encryptionInfo` plus a SMART response JSON and
   builds the verifier-openable mdoc response (DeviceResponse + HPKE seal).
   This helper is intentionally mdoc-specific and is used by the reference
   wallet's `org-iso-mdoc` handler; it is usable in tests with synthetic inputs.

## What it is **not**

- Not a new `VerifierAuthority`.
- Not a refactor of `protocol/`. It uses existing exports only and
  duplicates a few small CBOR helpers locally to avoid expanding the
  protocol module's surface area.
- Not part of the v1.0 SMART Health Check-in protocol (`spec.md`).
- Not a production wallet. Demo-grade keys and demo-grade local storage.
- Not a global navigator shim. Hosts should pass the chosen `CredentialGetter`
  explicitly into the verifier flow.

## Usage

```ts
import {
  createDcapiVerifier,
  type CredentialGetter,
} from "../sdk/dcapi-verifier.ts";
import { configureWebWallets } from "../sdk-web-wallet/index.ts";

const [demoWallet] = configureWebWallets({
  wallets: [
    {
      id: "smart-demo",
      label: "SMART Demo Web Wallet",
      walletUrl: new URL("../wallet/", location.href),
    },
  ],
});

button.addEventListener("click", () => {
  // STEP 1 (synchronous, inside the gesture): pre-open an about:blank holding
  // tab/window. Safari and Firefox will block window.open after an `await`.
  const popup = demoWallet.credentials.openPopup();
  if (!popup) {
    showError("Wallet window was blocked; allow popups for this site and try again.");
    return;
  }

  // STEP 2 (async, gesture already preserved): drive the verifier flow.
  const getCredential = demoWallet.credentials.createGetter({ popup });
  void runVerifier(getCredential);
});

async function runVerifier(getCredential: CredentialGetter): Promise<void> {
  const verifier = createDcapiVerifier({
    origin: location.origin,
    getCredential,
  });
  const result = await verifier.requestCredential(request);
  // result.completion.openedResponse.smartResponseValidation?.ok === true
}
```

The wallet tab/window is opened at `about:blank` first and navigated to
`walletUrl` only
after the verifier-side message listener is installed. This preserves the user
gesture **and** avoids a race where the wallet loads quickly and posts `ready`
before the verifier is listening.

If you don't pass `popup`, the getter falls back to opening an `about:blank`
tab/window itself and then navigating it — which only works if the getter call
site is still synchronous inside the user-gesture handler. The explicit
`openPopup()` pattern is more robust. By default, no feature string is passed to
`window.open`, so browsers typically render a normal tab rather than popup
chrome; callers can still opt into popup-style features.

## App-level wallet choice

Platform-vs-web choice belongs to the verifier app, not this layer. The demo
verifier's configured route (`/verifier/wallet-choice.html`) composes:

- an app-owned Platform Wallet source (`navigator.credentials.get`), and
- the configured web-wallet handles returned by `configureWebWallets`.

If only Platform Wallet is available, the verifier renders its normal default
button. If multiple enabled sources are available, it renders a compact
split-button/dropdown and passes the chosen source's `CredentialGetter` into
`createDcapiVerifier({ getCredential })`. No global navigator patching is used.

## Sequence (happy path)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant V as Verifier page
    participant G as createWebWalletCredentialGetter
    participant W as Wallet tab/window<br/>(../wallet/)

    U->>V: click "Open web wallet"
    Note over V: synchronous inside click handler
    V->>W: window.open("about:blank")
    V->>V: requestCredentialWithAuthority(...)
    V->>G: getCredential(credentialRequestOptions)
    G->>W: navigate tab/window to ../wallet/
    W-->>V: postMessage { type: "ready" } with targetOrigin "*"
    Note over W: no request session yet;<br/>ready carries no sensitive data
    Note over G: origin === walletUrl.origin ✓
    G->>W: postMessage { type: "request", credentialRequestOptions, requestId }
    Note over W: verifierOrigin = event.origin<br/>shown to user<br/>state === "waiting" ✓
    W->>U: render review (purpose + items)
    U->>W: click Approve & share
    Note over W: build DeviceResponse,<br/>HPKE-seal to verifier pub key
    W-->>G: postMessage { type: "response", requestId, outcome: "approved", credential }
    Note over G: requestId match ✓<br/>requested protocol ✓<br/>credential data ✓
    G-->>V: { protocol: "org-iso-mdoc", data: { response } }
    V->>V: openWalletResponse(...) → success badges
```

Error paths follow the same skeleton but settle with `outcome: "declined"
| "closed" | "error"`. The verifier-side errors are typed:
`WebWalletDeclined`, `WebWalletClosed`, `WebWalletTimeout`,
`WebWalletError`.

## Reference wallet data model

The reference wallet app mirrors the Android demo wallet's record-oriented
model. It can import Health Skillz ZIP/JSON exports into IndexedDB, normalize
providers and FHIR resources, match imported records against additive
`profiles` / `profilesFrom` / resource-type selectors, render inline
`form.fhir` Questionnaires, and build SMART response artifacts from the user's
selected records or reviewed Questionnaire answers. If no records have been
imported, it falls back to bundled demo records so the flow remains immediately
demoable.

## Hardening already in place

- **Single-flight** — a getter rejects concurrent calls until the first
  settles.
- **Per-getter unique window name** — two unrelated getters can't reuse
   the same `WindowProxy`.
- **Strict requestId match** — wallet replies missing or mismatched
  `requestId` are silently dropped.
- **Validated approved payload** — approved credentials must name one of the
  requested protocols and include `data` before resolving.
- **Origin-bound replies** (wallet side) — the wallet treats the inbound
  request's `MessageEvent.origin` as the verifier origin for that one request
  after rejecting opaque/unbindable origins. The consent UI displays that
  origin. Replies use that exact `targetOrigin` (never `"*"` after the request
  session starts), and the mdoc transcript is built with that origin.
- **Busy-safe wallet state machine** — the wallet only accepts a request
   when idle; concurrent requests get an `error: "wallet is busy"`.

## Wire compatibility

The wallet tab/window transports the unmodified `credentialRequestOptions` from
the verifier and returns the selected protocol's credential object. For the
reference `org-iso-mdoc` handler, that means the original `deviceRequest` and
`encryptionInfo` bytes are preserved inside `digital.requests[]`, and the
existing `openWalletResponse(...)` path opens the mdoc response with no changes.
The wallet uses browser-stamped `MessageEvent.origin` from the request as the
verifier origin for both reply `targetOrigin` and mdoc session transcript
binding.

## Conformance

The conformance gate is **"the existing verifier opens it"**: round-trip
tests build a response with `buildWebWalletDcapiResponse`, open it with
`openWalletResponse`, and assert `valueDigest.matches`,
`smartResponseValidation.ok`, and signature shape. Exact-byte parity with
Android fixtures is **not** a v1 goal — `hpkeSealDirectMdoc` generates
fresh ephemeral keys, and ECDSA signatures are nondeterministic.
