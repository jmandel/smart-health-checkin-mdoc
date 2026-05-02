# rp-web

Relying-party web app for SMART Health Check-in over `org-iso-mdoc`.

Stack: **Bun + TypeScript + React + Zustand**. No Vite, no pnpm.

## Run

```sh
bun install
bun index.html        # dev server with HMR (http://localhost:3000 by default)
```

For a GitHub Pages-equivalent local preview from the repo root, use:

```sh
scripts/serve-pages.sh
```

That command runs the same `scripts/build-pages.sh` used by the Pages workflow
and serves the generated `_site` artifact at `http://localhost:3015/`. The
verifier and kiosk pages are therefore available under `/verifier/`, matching
the deployed site layout.

Or via npm-style scripts:

```sh
bun run dev           # bun index.html
bun run dev:kiosk     # bun creator.html
bun run build         # build index.html, creator.html, and submit.html into dist/
bun run inspect:mdoc  # decode a direct mdoc navigator arg or fixture dir
bun run inspect:response # decode a direct mdoc response wrapper or plaintext DeviceResponse
bun test              # protocol/unit tests
```

## Layout

```
rp-web/
  index.html              # same-device verifier entry
  creator.html            # kiosk/desktop QR creator entry
  submit.html             # phone submission entry
  src/
    main.tsx              # React root
    App.tsx               # Top-level UI
    store.ts              # Zustand store + presets + DC-API support detect
    app/                  # Child components, styles
      styles.css
    sdk/                  # Library-shaped SMART Check-in SDK modules
      README.md           # Non-React TypeScript SDK guide
      react.README.md     # Optional React bindings guide
    debug/
      events.ts           # @@SHC@@<KIND>@@<json> emitter + ring buffer
    protocol/             # direct mdoc request/response helpers
      index.ts            # types, CBOR builders, vectors
      README.md
    kiosk/                # provider-backed static kiosk workflow + Instant provider
    instant/              # InstantDB schema/client initialization
  scripts/
    inspect-mdoc-request.ts
    inspect-mdoc-response.ts
```

## SDK documentation

The app now has reusable SDK-shaped modules under `src/sdk/`:

| Doc | Covers |
| --- | --- |
| [`src/sdk/README.md`](src/sdk/README.md) | Transport-neutral SMART request/response model, browser DC API verifier flow, verifier authority seam, kiosk session descriptor helpers. |
| [`src/sdk/react.README.md`](src/sdk/react.README.md) | Optional React hooks/components over the verifier SDK. |

`src/sdk/index.ts` is intentionally React-free. Import React bindings directly
from `src/sdk/react.tsx`.

## Current surface

The page shows:

- A SMART request **preset selector** with three presets (Patient, Patient+Coverage, Inline Questionnaire).
- A **request JSON textarea**, validated on every keystroke.
- A **Call Credential Manager** button, disabled when:
  - the request JSON doesn't validate, **or**
  - this browser doesn't expose `navigator.credentials.get` + a Digital Credentials global.
- A **Run ID** that resets on demand.
- A **console event log** of all `@@SHC@@` events, also written to the JS console for CDP capture scripts.
- A **Build request & call navigator.credentials.get** button that emits:
  - `SMART_REQUEST_INFO`
  - `DEVICE_REQUEST`
  - `ENCRYPTION_INFO`
  - `DCAPI_ARGUMENT`

The active protocol helper builds direct `org-iso-mdoc` requests with
`data.deviceRequest` and `data.encryptionInfo`.

## Kiosk mailbox demo

The static kiosk apps are written against a provider abstraction in
`src/kiosk/kiosk-provider.ts`, not directly against InstantDB. The high-level
workflow is:

| Side | Wrapper call | Responsibility |
| --- | --- | --- |
| Kiosk/creator | `initiateKioskRequest` | Sign the full SMART request as ES256 JWS, encrypt that JWS for the submission service key, store it through the provider, and return a small QR pointer URL. |
| Phone/submitter | `resolveKioskRequest` | Read the provider request row by pointer, decrypt it locally, verify the creator JWS with a baked trusted demo key, and recover the embedded SMART request. |
| Phone/submitter | `completeKioskRequest` | Encrypt the opened DC API result to the kiosk's per-session desktop key and write the submission through the provider. |
| Kiosk/creator | `openKioskSubmission` | Download the encrypted submission blob through the provider, decrypt it in browser memory, validate route/session/hash/nonce/form bindings, and render the result. |

`KioskTransportProvider` is the narrow transport interface. A provider supplies
`appId`, `configured`, `writeRequest`, `readRequest`, `writeSubmission`,
`downloadSubmissionBlob`, and `useSubmissionRows`. The React pages use this
interface plus the protocol helpers; they do not need to know how request rows,
realtime subscriptions, or blob downloads are implemented.

The current provider is `instantKioskProvider` in `src/kiosk/instant-mailbox.ts`.
It uses InstantDB for small request/submission pointer rows and Instant Storage
for encrypted response blobs under `submissions/<routeId>/`. Instant is treated
as untrusted transport: request details such as FHIR profiles and questionnaires
are inside a signed JWS that is encrypted before storage, and submitted wallet
results are encrypted before upload. Instant sees routing IDs, timestamps,
sizes/hashes, key IDs, and ciphertext, not plaintext SMART request/response
details.

The QR contains only `#r=<requestId>`. The phone resolves that pointer through
the provider, decrypts the request with the demo submission-service private key,
verifies the JWS against the baked trusted demo creator public key, and then runs
the normal Digital Credentials API flow via the reusable React
`SmartCheckinButton`.

The creator page subscribes to provider submissions for its route and
automatically downloads/decrypts matching blobs. Opened results reuse the same
review component as the same-device requester page: rendered artifact cards,
item status, and expandable technical details.

Demo key material lives in `src/kiosk/demo-keys.ts`. It is intentionally checked
in so the static demo can run without a server. These keys are not secret and
must not be used for production traffic.

The public Instant app ID is committed in `src/instant/public-config.ts` so the
GitHub Pages build is self-contained. Local or deployment environments can
override it with `BUN_PUBLIC_INSTANT_APP_ID`.

## Inspector

Decode a captured direct-mdoc navigator argument:

```sh
bun run inspect:mdoc ../fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc
```

Write a normalized artifact bundle:

```sh
bun run inspect:mdoc capture.json --origin https://clinic.example --out ../fixtures/captures/my-run
```

Decode response-side artifacts:

```sh
bun run inspect:response ../fixtures/responses/pymdoc-minimal/document.cbor
bun run inspect:response wallet-response.json --out ../fixtures/responses/my-run
```

`wallet-response.json` decodes the outer `["dcapi", {enc, cipherText}]`
wrapper only. The browser UI uses the in-memory verifier private key from the
same request to HPKE-open real responses and then inspect the plaintext
`DeviceResponse`.

## Capture-friendly events

Every notable UI action emits a stable, single-line console event:

```
@@SHC@@BOOT@@{"kind":"BOOT","at":"...","runId":"run_...","payload":{...}}
@@SHC@@PRESET_SELECTED@@{"kind":"PRESET_SELECTED",...}
@@SHC@@DCAPI_CALL_REQUESTED@@{...}
```

These match the format consumed by `tools/capture/capture-dc-request.mjs` and
`tools/capture/probe-browser-branching.mjs`.
