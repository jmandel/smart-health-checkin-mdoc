# rp-web

Relying-party web app for SMART Health Check-in over `org-iso-mdoc`.

Stack: **Bun + TypeScript + React + Zustand**. No Vite, no pnpm.

## Run

```sh
bun install
bun index.html        # dev server with HMR (http://localhost:3000 by default)
```

Or via npm-style scripts:

```sh
bun run dev           # bun index.html
bun run build         # bun build ./index.html --outdir=./dist
bun run inspect:mdoc  # decode a direct mdoc navigator arg or fixture dir
bun run inspect:response # decode a direct mdoc response wrapper or plaintext DeviceResponse
bun test              # protocol/unit tests
```

## Layout

```
rp-web/
  index.html              # Bun fullstack entry
  src/
    main.tsx              # React root
    App.tsx               # Top-level UI
    store.ts              # Zustand store + presets + DC-API support detect
    app/                  # Child components, styles
      styles.css
    debug/
      events.ts           # @@SHC@@<KIND>@@<json> emitter + ring buffer
    protocol/             # direct mdoc request/response helpers
      index.ts            # types, CBOR builders, vectors
      README.md
  scripts/
    inspect-mdoc-request.ts
    inspect-mdoc-response.ts
```

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

These match the format consumed by `capture/capture-dc-request.mjs` and
`capture/probe-browser-branching.mjs`.
