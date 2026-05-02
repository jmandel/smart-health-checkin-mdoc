# Capture Tools

These tools are for checking what a verifier page actually passes to the
Digital Credentials API.

## Android RP-to-Wallet Capture

`capture-android-rp-flow.mjs` drives the local RP web app in Android Chrome,
records the RP-side `@@SHC@@` debug events, pulls the latest wallet handler run
from the connected Android device, and joins both sides into one inspectable
fixture.

Typical one-command run, after `adb connect ...`:

```sh
node tools/capture/capture-android-rp-flow.mjs \
  --url http://127.0.0.1:3010 \
  --adb-auto-wallet
```

If the RP server is not already running, the script starts `rp-web` on the port
from `--url`. For local URLs it also runs `adb reverse` so Android Chrome can
reach the host server.

The RP button is clicked through Android Chrome CDP by selector, using
`Runtime.evaluate(..., userGesture: true)` first and a CDP touch event on the
same selector second. `--rp-tap 'x,y'` is only a final fallback.

The `--adb-auto-wallet` flag waits until the RP has emitted
`REQUEST_ARTIFACTS`, then uses fixed Pixel 10 Pro XL coordinates for the current
two-step Android flow:

```text
785,2135  Credential Manager "Agree and continue"
540,2174  Wallet "Share selected data"
```

Override them with `--wallet-taps 'x,y,delayMs;x,y,delayMs'` if the UI moves.

Output is split and then joined:

```text
tools/capture/android-rp-flow/<timestamp>/  # RP console events and request keys
/tmp/shc-handler-runs/run-*/rp-request/     # verifier private/public JWKs and request bytes
/tmp/shc-handler-runs/run-*/rp-capture/     # RP event log copied into the wallet run
/tmp/shc-handler-runs/run-*/analysis/hpke-opened/
```

The key artifact is `rp-request/recipient-private.jwk.json`. That is the
verifier HPKE private key emitted by the RP for offline debugging. The script
then calls `rp-web/scripts/validate-android-mdoc-response.ts` to prove that the
saved key and session transcript can reopen the Android wallet ciphertext.

## Browser Branching Probe

`probe-browser-branching.mjs` launches Chromium with CDP, installs a pre-page-load
hook around `navigator.credentials.get`, and writes a capture bundle.

Useful runs:

```sh
node tools/capture/probe-browser-branching.mjs --profile chrome --mode stub
node tools/capture/probe-browser-branching.mjs --profile safari-macos --mode stub
node tools/capture/probe-browser-branching.mjs --profile safari-ios --mode stub
```

By default the script opens `https://tools.mattrlabs.com/verify-credentials`.
Click the verifier button in the opened browser. Output goes under:

```text
tools/capture/browser-branching/<timestamp>-<profile>-<mode>/
```

Key files:

```text
run.json
probe-events.json
console.raw.log
navigator-credentials-get.arg.json
notes.md
```

Modes:

- `stub`: replace the credential API with a capture stub. This avoids launching
  a real wallet and works for observing request construction.
- `wrap`: wrap and forward to the real browser API. Use this when the local
  browser/platform can actually launch Credential Manager.

Safari profiles here are still Chromium with Safari-like user-agent and device
settings. They can reveal site-side user-agent branching, but they do not prove
actual WebKit behavior.

## Real Safari Capture

For actual Safari/WebKit behavior, use `manual-safari-hook.js` on a Mac or iOS
device with Web Inspector:

1. Open the verifier page in Safari.
2. Open Web Inspector.
3. Paste the contents of `manual-safari-hook.js` into the console.
4. Click the verifier button.
5. Copy the `@@DC-SAFARI-CAPTURE@@credentials.get@@...` console payload into a
   fixture folder.

If you only want the request argument and do not want Safari to launch a wallet,
edit `FORWARD_TO_BROWSER` to `false` before pasting.
