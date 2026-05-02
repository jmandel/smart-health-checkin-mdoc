# smart-health-checkin-mdoc

A **SMART Health Check-in** prototype: a transport-neutral check-in
request/response model bound to the W3C Digital Credentials API over direct
`org-iso-mdoc`. The repo ships an end-to-end demo — Android wallet, web
verifier, and a cross-device kiosk flow — driven by checked-in byte fixtures
captured from a real Chrome/Android session and exercised by Android,
TypeScript, and Python test suites that validate request parsing, HPKE-opened
response bytes, MSO digest binding, and COSE signatures.

Live demo: <https://jmandel.github.io/smart-health-checkin-mdoc/>

## Quickstart

```sh
cd rp-web && bun install && cd ..
scripts/serve-pages.sh         # builds _site, serves http://localhost:3015/
```

The preview serves the same `_site` artifact GitHub Pages deploys, so kiosk
URLs live under `/verifier/` exactly as in production.

## Where to start

For a fresh pickup, in order:

1. The deployed site (or the local preview above).
2. [`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`](docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md)
   — the transport-neutral request/response model.
3. [`docs/PROTOCOL-EXPLAINER.md`](docs/PROTOCOL-EXPLAINER.md) — roles, data
   movement, and trust boundaries.
4. [`docs/profiles/org-iso-mdoc.md`](docs/profiles/org-iso-mdoc.md) — the
   active wire profile and mdoc/COSE invariants.

Plans, research, and archive material under `docs/plans/`, `docs/research/`,
and `docs/archive/` are historical and not part of the public pickup path.

## Major components

- **SMART Health Check-in protocol.** A transport-neutral JSON
  request/response model used by every component. Defined in
  [`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`](docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md);
  walked through in [`docs/PROTOCOL-EXPLAINER.md`](docs/PROTOCOL-EXPLAINER.md).

- **`org-iso-mdoc` wire profile.** The active binding to the W3C Digital
  Credentials API: the SMART request rides inside
  `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and the
  SMART response comes back in the stable mdoc element
  `smart_health_checkin_response`. See
  [`docs/profiles/org-iso-mdoc.md`](docs/profiles/org-iso-mdoc.md).

- **TypeScript verifier SDK.** Framework-neutral SMART request/response
  validation, browser DC API verifier flow, verifier-authority seam, and
  kiosk request descriptor helpers. Optional React bindings ship alongside.
  Start at [`rp-web/src/sdk/README.md`](rp-web/src/sdk/README.md) and
  [`rp-web/src/sdk/react.README.md`](rp-web/src/sdk/react.README.md).

- **Web verifier and kiosk demo.** React app under
  [`rp-web/`](rp-web/README.md) hosting the same-device verifier and the
  cross-device kiosk flow (desktop creator ↔ phone submitter over an
  untrusted realtime mailbox). The transport sits behind a small provider
  interface; the shipped provider uses InstantDB rows plus Instant Storage
  blobs. Slim row schema documented in
  [`docs/plans/kiosk-transport-row-slim.md`](docs/plans/kiosk-transport-row-slim.md).

- **Android wallet.** Modular Gradle project under
  [`wallet-android/`](wallet-android/README.md) that registers credentials
  with Credential Manager and answers direct mdoc requests carrying SMART
  Health Check-in payloads, including the Rust WASM matcher
  ([`wallet-android/app/matcher-rs/README.md`](wallet-android/app/matcher-rs/README.md)).

- **Public site.** Landing page and HTML explainers in
  [`site/`](site/index.html): the SMART model explainer, the kiosk flow
  explainer, and a byte-level wire-protocol inspector that fetches the same
  checked-in fixtures the test suites use.

- **Fixtures and tools.** [`fixtures/`](fixtures/) holds normalized,
  checked-in byte captures shared across every language's tests;
  [`tools/`](tools/) collects developer-only capture scripts,
  fixture-generation utilities, and diagnostic matchers.

## GitHub Pages deployment

The repo deploys as one static site via
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on
pushes to `main` and on manual workflow dispatch.

| Path | Page |
| --- | --- |
| `/` | Landing page (`site/index.html`) |
| `/verifier/` | Same-device verifier |
| `/verifier/creator.html` | Kiosk creator (desktop) |
| `/verifier/submit.html` | Kiosk submit (phone) |
| `/smart-model-explainer.html` | SMART Health Check-in model explainer |
| `/kiosk-flow-explainer.html` | Cross-device kiosk flow explainer |
| `/wire-protocol-explainer.html` | Byte-level wire-protocol explainer |
| `/llms.txt` | Generated LLM-friendly docs bundle |
| `/fixtures/` | Checked-in test fixtures |

Local artifact build (no preview server):

```sh
cd rp-web && bun install
cd ..
scripts/build-pages.sh
```

