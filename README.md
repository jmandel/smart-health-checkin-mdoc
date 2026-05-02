# smart-health-checkin-mdoc

Working folder for a **new, independent Android wallet app plus relying-party
web verifier** for W3C Digital Credentials API requests using direct
`org-iso-mdoc`. The prototype now has a real Chrome/Android handler capture
promoted into fixtures, plus Android/TypeScript/Python tests that validate the
request parser, HPKE-opened response bytes, MSO digest binding, and COSE
signatures.

The current checked-in implementation carries the transport-neutral SMART
Health Check-in request JSON from
[`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`](docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md) in
`ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, over the same
direct mdoc transport with stable response element
`smart_health_checkin_response`.

Not part of the CMWallet POC — only the matcher technique is reused.

## Files

| File | Purpose |
| ---- | ------- |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Problem statement, the idiosyncratic mdoc design, why we're doing this, and what both sides build. |
| [docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md](docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md) | Draft active transport-neutral SMART Health Check-in clinical request/response payload shape. |
| [docs/PROTOCOL-EXPLAINER.md](docs/PROTOCOL-EXPLAINER.md) | Medium-high-level protocol walkthrough: roles, data movement, trust boundaries, and component contracts. |
| [docs/PLAN.md](docs/PLAN.md) | Current implementation state, proof points, validation commands, and remaining work. |
| [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) | Narrow list of unresolved questions for the active direct-mdoc path. |
| [docs/profiles/org-iso-mdoc.md](docs/profiles/org-iso-mdoc.md) | Exact active wire profile and mdoc/COSE invariants. |
| [site/smart-model-explainer.html](site/smart-model-explainer.html) | High-level SMART Health Check-in request/response model explainer source. |
| [site/kiosk-flow-explainer.html](site/kiosk-flow-explainer.html) | Cross-device kiosk flow explainer source for the in-person wrapper over the same presentation flow. |
| [site/wire-protocol-explainer.html](site/wire-protocol-explainer.html) | Byte-level Digital Credentials API/direct mdoc explainer source using the checked-in real request/response fixtures. |
| [rp-web/src/sdk/README.md](rp-web/src/sdk/README.md) | TypeScript SDK documentation for the transport-neutral SMART model, browser DC API verifier, verifier authority seam, and kiosk session descriptors. |
| [rp-web/src/sdk/react.README.md](rp-web/src/sdk/react.README.md) | Optional React bindings documentation for hooks/components over the non-React verifier SDK. |
| [wallet-android/README.md](wallet-android/README.md) | Android wallet library/module guide, including links to each Gradle module README. |
| [wallet-android/app/matcher/README.md](wallet-android/app/matcher/README.md) | Rust WASM matcher built by the Android app and registered with Credential Manager. |
| [fixtures/](fixtures/) | Checked-in byte fixtures and normalized captures used by tests and inspectors. |
| [tools/](tools/) | Developer-only capture scripts, fixture-generation tooling, and diagnostic matcher utilities. |
| [docs/research/](docs/research/) | Reference material for DC API, matcher ABI, mdoc response, encryption, and verifier architecture. |
| [docs/archive/](docs/archive/) | Historical plans, old profile docs, OpenID4VP notes, and alternate explainer drafts. |

## Libraries and SDKs

The current repo still builds as a demo web verifier plus Android app, but the
core code is organized around reusable library boundaries:

| Library area | Start here | Notes |
| --- | --- | --- |
| TypeScript core/verifier SDK | [`rp-web/src/sdk/README.md`](rp-web/src/sdk/README.md) | Framework-neutral SMART request/response validation, browser DC API verifier flow, verifier authority seam, kiosk session descriptor helpers. |
| React bindings | [`rp-web/src/sdk/react.README.md`](rp-web/src/sdk/react.README.md) | Optional hooks/components over the same verifier authority API; intentionally not re-exported from the non-React SDK barrel. |
| Android wallet libraries | [`wallet-android/README.md`](wallet-android/README.md) | Gradle module split for core SMART logic, mdoc transport, Credential Manager registration, Compose UI, and demo app wiring. |

## GitHub Pages deployment

This repo can publish the verifier, kiosk demo, and explainers as one static
GitHub Pages site. The landing page source is `site/index.html`; the Pages build
places the verifier at `/verifier/`, the kiosk creator at
`/verifier/creator.html`, the phone submission page at `/verifier/submit.html`,
the SMART model explainer at `/smart-model-explainer.html`, the kiosk flow
explainer at `/kiosk-flow-explainer.html`, the byte-level wire-protocol
explainer at `/wire-protocol-explainer.html`, an LLM-friendly generated docs
bundle at `/llms.txt`, and the checked-in test fixtures at `/fixtures/` so the
wire page can fetch the same captures used by the test suites. The old
generic explainer URLs are not kept; use the specific explainer URLs above.

The kiosk pages are static apps over a provider abstraction. The creator calls a
wrapper to sign/encrypt a full SMART request, store it through the configured
provider, and display a QR containing only a request pointer. The submit page
resolves that pointer through the same provider contract, decrypts and verifies
the request locally, runs the Digital Credentials API flow, then completes the
request by writing an encrypted result through the provider. The current provider
uses InstantDB rows plus Instant Storage blobs as untrusted transport; see
[`rp-web/README.md`](rp-web/README.md#kiosk-mailbox-demo) for the interface and
Instant-specific details.

Local artifact build:

```sh
cd rp-web && bun install
cd ..
scripts/build-pages.sh
```

Local Pages-equivalent preview:

```sh
scripts/serve-pages.sh          # builds _site, then serves http://localhost:3015/
PORT=4173 scripts/serve-pages.sh
```

Use this preview when testing the static apps locally. It serves the same `_site`
artifact that the GitHub Actions workflow uploads, so kiosk URLs live under
`/verifier/` just like the deployed Pages site.

The workflow in `.github/workflows/deploy-pages.yml` builds `_site` and deploys
it with the GitHub Pages artifact action on pushes to `main` or manual workflow
dispatches.

Read order for a fresh pickup: `docs/CONTEXT.md` →
`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` →
`docs/PROTOCOL-EXPLAINER.md` → `docs/profiles/org-iso-mdoc.md` →
`docs/PLAN.md` → `docs/OPEN-QUESTIONS.md`. Use `docs/archive/` only for
historical context.
