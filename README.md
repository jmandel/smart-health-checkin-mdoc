# smart-health-checkin-mdoc

A **SMART Health Check-in** prototype: a transport-neutral check-in
request/response model bound to the W3C Digital Credentials API over direct
`org-iso-mdoc`. The repo ships an end-to-end demo — Android wallet, web
verifier, and an in-person kiosk handoff demo — driven by checked-in byte
fixtures captured from a real Chrome/Android session and exercised by Android,
TypeScript, and Python test suites that validate request parsing, HPKE-opened
response bytes, MSO digest binding, and COSE signatures.

SMART Health Check-in 1.0 is intentionally two-layered: the clinical
request/response JSON model plus the same-device direct `org-iso-mdoc`
presentation flow. QR codes, kiosks, desktop/staff handoffs, relays, and
completion screens in this repo are deployment/demo UX around that same-device
flow, not standardized SMART Health Check-in 1.0 pointer, relay, submission, or
completion protocols.

Live demo: <https://jmandel.github.io/smart-health-checkin-mdoc/>

## Quickstart

```sh
cd rp-web && bun install && cd ..
scripts/serve-pages.sh         # builds _site, serves http://localhost:3015/
```

The preview serves the same `_site` artifact GitHub Pages deploys, so verifier
and demo handoff URLs live under `/verifier/` exactly as in production.

## Where to start

For a fresh pickup, in order:

1. The deployed site (or the local preview above).
2. [`spec.md`](spec.md) — the assembled SMART Health Check-in 1.0 draft
   spec: clinical request/response model, trust framework, and the same-device
   `org-iso-mdoc` presentation flow with appendices for JSON Schema, CDDL,
   the byte ladder, and the fixture index.
3. [`docs/CONTEXT.md`](docs/CONTEXT.md) — repository-level orientation for
   what's checked in and how the pieces wire together.

Research notes and archive material under `docs/research/` and
`docs/archive/` are historical and not part of the public pickup path.

## Major components

- **SMART Health Check-in protocol.** A transport-neutral JSON
  request/response model used by every component. Defined in [`spec.md`](spec.md)
  (sections 5/6, JSON Schema in Appendix B).

- **`org-iso-mdoc` wire profile.** The active binding to the W3C Digital
  Credentials API: the SMART request rides inside
  `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and the
  SMART response comes back in the stable mdoc element
  `smart_health_checkin_response`. Specified in [`spec.md`](spec.md) §8,
  with CDDL and byte-ladder details in Appendices C and E.

- **TypeScript verifier SDK.** Framework-neutral SMART request/response
  validation, browser DC API verifier flow, verifier-authority seam, and
  deployment-handoff helpers used by the kiosk demo. Optional React bindings ship alongside.
  Start at [`rp-web/src/sdk/README.md`](rp-web/src/sdk/README.md) and
  [`rp-web/src/sdk/react.README.md`](rp-web/src/sdk/react.README.md).

- **Web verifier and kiosk handoff demo.** React app under
  [`rp-web/`](rp-web/README.md) hosting the same-device verifier and an
  in-person desktop-to-phone handoff demo (desktop creator ↔ phone submitter
  over an untrusted realtime mailbox). That handoff is demo/deployment behavior
  around the same-device verifier page, not a version 1.0 protocol layer. The
  demo transport sits behind a small provider interface; the shipped provider
  uses InstantDB rows plus Instant Storage blobs.

- **Android wallet.** Modular Gradle project under
  [`wallet-android/`](wallet-android/README.md) that registers credentials
  with Credential Manager and answers direct mdoc requests carrying SMART
  Health Check-in payloads, including the Rust WASM matcher
  ([`wallet-android/app/matcher-rs/README.md`](wallet-android/app/matcher-rs/README.md)).

- **Public site.** Landing page and HTML explainers in
  [`site/`](site/index.html): the SMART model explainer, the kiosk handoff demo
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
| `/verifier/creator.html` | Kiosk handoff demo creator (desktop) |
| `/verifier/submit.html` | Kiosk handoff demo submitter (phone) |
| `/smart-model-explainer.html` | SMART Health Check-in model explainer |
| `/kiosk-flow-explainer.html` | Kiosk handoff demo explainer |
| `/wire-protocol-explainer.html` | Byte-level wire-protocol explainer |
| `/spec.html` | SMART Health Check-in 1.0 draft spec — rendered HTML with TOC, syntax highlighting, and Mermaid diagrams |
| `/spec.md` | SMART Health Check-in 1.0 draft spec — raw Markdown source (assembled from `spec-work/`) |
| `/llms.txt` | Generated LLM-friendly docs bundle |
| `/fixtures/` | Checked-in test fixtures |

Local artifact build (no preview server):

```sh
cd rp-web && bun install
cd ..
scripts/build-pages.sh
```
