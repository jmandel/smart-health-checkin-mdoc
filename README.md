# smart-health-checkin-mdoc

Working folder for a **new, independent Android wallet app plus relying-party
web verifier** for W3C Digital Credentials API requests using direct
`org-iso-mdoc`. The prototype now has a real Chrome/Android handler capture
promoted into fixtures, plus Android/TypeScript/Python tests that validate the
request parser, HPKE-opened response bytes, MSO digest binding, and COSE
signatures.

The current checked-in implementation carries the transport-neutral SMART
Health Check-in request JSON from
`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` in
`ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, over the same
direct mdoc transport with stable response element
`smart_health_checkin_response`.

Not part of the CMWallet POC — only the matcher technique is reused.

## Files

| File | Purpose |
| ---- | ------- |
| [CONTEXT.md](CONTEXT.md) | Problem statement, the idiosyncratic mdoc design, why we're doing this, and what both sides build. |
| [SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md](SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md) | Draft active transport-neutral SMART Health Check-in clinical request/response payload shape. |
| [PROTOCOL-EXPLAINER.md](PROTOCOL-EXPLAINER.md) | Medium-high-level protocol walkthrough: roles, data movement, trust boundaries, and component contracts. |
| [PLAN.md](PLAN.md) | Current implementation state, proof points, validation commands, and remaining work. |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | Narrow list of unresolved questions for the active direct-mdoc path. |
| [profiles/org-iso-mdoc.md](profiles/org-iso-mdoc.md) | Exact active wire profile and mdoc/COSE invariants. |
| [explainer.html](explainer.html) | High-level SMART Health Check-in request/response model explainer. |
| [wire-protocol.html](wire-protocol.html) | Byte-level Digital Credentials API/direct mdoc explainer using the checked-in real request/response fixtures. |
| [fixtures/](fixtures/) | Checked-in byte fixtures and normalized captures used by tests and inspectors. |
| [fixtures-tool/](fixtures-tool/) | Developer-only Python sidecar for pyMDOC-CBOR grounding fixtures. |
| [capture/](capture/) | Capture scripts for real browser/RP flows, including the Android Chrome → Credential Manager → wallet automation that saves the RP HPKE key for offline validation. |
| [research/](research/) | Reference material for DC API, matcher ABI, mdoc response, encryption, and verifier architecture. |
| [archive/](archive/) | Historical plans, old profile docs, OpenID4VP notes, and alternate explainer drafts. |

## GitHub Pages deployment

This repo can publish the verifier and explainers as one static GitHub Pages
site. The landing page is `index.html`; the Pages build places the verifier at
`/verifier/`, the SMART model explainer at `/explainer.html`, the byte-level
wire-protocol explainer at `/wire-protocol.html`, and the checked-in test
fixtures at `/fixtures/` so the wire page can fetch the same captures used by
the test suites.

Local artifact build:

```sh
cd rp-web && bun install
cd ..
scripts/build-pages.sh
```

The workflow in `.github/workflows/deploy-pages.yml` builds `_site` and deploys
it with the GitHub Pages artifact action on pushes to `main` or manual workflow
dispatches.

Read order for a fresh pickup: `CONTEXT.md` →
`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` → `PROTOCOL-EXPLAINER.md` →
`profiles/org-iso-mdoc.md` → `PLAN.md` → `OPEN-QUESTIONS.md`. Use `archive/`
only for historical context.
