# React bindings for SMART Health Check-in

`react.tsx` is the optional React layer over the framework-neutral TypeScript
SDK. It should stay thin: React owns state, lifecycle, and ergonomic UI entry
points; `core.ts` and `dcapi-verifier.ts` own the SMART model and verifier
protocol flow.

Import React bindings explicitly:

```ts
import {
  SmartCheckinButton,
  useDcApiSupport,
  useSmartCheckinVerifier,
} from "./sdk/react.tsx";
```

Do not import them through `./sdk/index.ts`; the index barrel deliberately
stays React-free so other frameworks can use the same SDK.

## When to use this layer

Use the React bindings when a page needs to:

- show whether the current browser can call Digital Credentials API;
- launch a SMART Check-in credential request from a button or form;
- observe prepare/request/complete/error phases;
- swap browser-local verifier crypto for a future server-owned authority without
  rewriting UI flow.

Use the non-React SDK directly when building:

- Vue, Svelte, Solid, or vanilla TypeScript applications;
- server routes;
- tests and fixture tools;
- native/webview bridges.

## Hook: `useDcApiSupport`

```tsx
import { useDcApiSupport } from "./sdk/react.tsx";

function DcApiGate() {
  const support = useDcApiSupport();

  if (support.state === "supported") {
    return <p>Your browser can request digital credentials.</p>;
  }

  if (support.state === "checking") {
    return <p>Checking browser support...</p>;
  }

  return <p>Digital Credentials API is not available: {support.reason}</p>;
}
```

The hook wraps `detectDcApiSupport()` from `dcapi-verifier.ts`.

## Hook: `useSmartCheckinVerifier`

`useSmartCheckinVerifier` manages a credential request lifecycle:

| Phase | Meaning |
| --- | --- |
| `idle` | No active request. |
| `preparing` | The verifier authority is building a Digital Credentials request. |
| `requesting` | The page is calling or waiting on `navigator.credentials.get`. |
| `completing` | The verifier authority is opening/validating the returned credential. |
| `complete` | A SMART Check-in response was received and validated. |
| `error` | The flow failed or was rejected. |

Browser-local example:

```tsx
import { useSmartCheckinVerifier } from "./sdk/react.tsx";
import type { SmartCheckinRequest } from "./sdk/core.ts";

function ShareCheckin({ request }: { request: SmartCheckinRequest }) {
  const verifier = useSmartCheckinVerifier({
    origin: location.origin,
    onComplete(completion) {
      console.log("SMART response", completion.openedResponse.smartResponse);
    },
  });

  return (
    <>
      <button
        disabled={["preparing", "requesting", "completing"].includes(verifier.phase)}
        onClick={() => verifier.requestCredential(request)}
      >
        Share check-in information
      </button>

      {verifier.phase === "error" && (
        <p role="alert">{verifier.error.message}</p>
      )}
    </>
  );
}
```

Server-owned authority example:

```tsx
import { useMemo } from "react";
import { useSmartCheckinVerifier } from "./sdk/react.tsx";
import { createServerVerifierAuthority } from "./server-authority-client.ts";

function PortalShare({ request }) {
  const authority = useMemo(
    () => createServerVerifierAuthority("/api/checkin"),
    [],
  );

  const verifier = useSmartCheckinVerifier({
    authority,
    onComplete(completion) {
      console.log("backend-opened response", completion.openedResponse.smartResponse);
    },
  });

  return (
    <button onClick={() => verifier.requestCredential(request)}>
      Open wallet
    </button>
  );
}
```

The UI code is the same shape for browser-local and server-owned verifier
crypto. Only the `authority` changes.

## Component: `SmartCheckinButton`

`SmartCheckinButton` is a convenience component over the hook.

```tsx
import { SmartCheckinButton } from "./sdk/react.tsx";

function CheckinButton({ request }) {
  return (
    <SmartCheckinButton
      request={request}
      verifier={{ origin: location.origin }}
      onComplete={(completion) => {
        console.log(completion.openedResponse.smartResponse);
      }}
    />
  );
}
```

Custom labels can use function-as-children:

```tsx
<SmartCheckinButton request={request} verifier={{ origin: location.origin }}>
  {(state) => {
    if (state.phase === "requesting") return "Choose your wallet...";
    if (state.phase === "completing") return "Checking response...";
    if (state.phase === "complete") return "Received";
    return "Share information";
  }}
</SmartCheckinButton>
```

## Renderer components

This file currently provides bindings, not a full renderer kit. The next React
layer should add reusable components for:

- SMART request summaries;
- FHIR resource/profile-family request rows;
- Questionnaire prompts and answer collection;
- consent/selection review;
- response artifacts and per-item status;
- debug/evidence panels.

Those components should consume `SmartCheckinRequest`,
`SmartCheckinResponse`, `VerifierPreparedCredentialRequest`, and
`VerifierCredentialCompletion` from the non-React SDK. They should not duplicate
protocol parsing or mdoc handling.

## Design rules

- Keep React optional. Do not re-export React APIs from `sdk/index.ts`.
- Keep protocol logic out of components and hooks.
- Accept an injected `VerifierAuthority` so server-owned verifier crypto can fit
  without changing UI components.
- Surface errors to callers; do not silently swallow a failed credential request.
- Prefer render props or small composable components over one large opinionated
  demo widget.
