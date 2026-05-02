# TypeScript SMART Health Check-in SDK

These modules are the library-shaped boundary inside the `rp-web` verifier app.
They are not published packages yet, but they are organized as if they will
become:

| Future package | Current source | Purpose |
| --- | --- | --- |
| `@smart-health-checkin/core` | `core.ts` | Transport-neutral SMART request/response model and validation. |
| `@smart-health-checkin/dcapi-verifier` | `dcapi-verifier.ts` | Browser Digital Credentials API verifier flow and verifier-authority seam. |
| `@smart-health-checkin/kiosk-session` | `kiosk-session.ts` | QR request descriptors that do not depend on a specific relay/backend. |
| `@smart-health-checkin/react` | `react.tsx` | Optional React hooks/components. Documented separately in [`react.README.md`](react.README.md). |

The non-React barrel, `index.ts`, intentionally does **not** export
`react.tsx`. Consumers using Vue, Svelte, plain TypeScript, server code, tests,
or mobile bridges should be able to import the SDK without bringing in React.

## Mental model

SMART Health Check-in has two application-level roles:

| Role | What it does |
| --- | --- |
| Requester/verifier | Builds a SMART Check-in request: "for this check-in, please share these FHIR resources or answer this Questionnaire." |
| Responder/wallet | Parses the request, shows the user what is being requested, gets consent/input, and returns a SMART Check-in response. |

The SMART payloads are transport-neutral JSON. The current demo carries them
over W3C Digital Credentials API using direct `org-iso-mdoc`, but the core
request/response shape is not mdoc-specific.

```text
Requester/verifier
  SmartCheckinRequest
    items:
      - fhir.resources: profiles, profilesFrom, or resourceTypes
      - questionnaire: canonical URL or inline Questionnaire

Responder/wallet
  SmartCheckinResponse
    artifacts:
      - FHIR JSON, SMART Health Cards, or other accepted media
    requestStatus:
      - fulfilled, partial, unavailable, declined, unsupported, or error
```

The Digital Credentials API layer wraps this model in browser/platform
plumbing:

```text
SMART request JSON
  -> direct mdoc DeviceRequest + encryptionInfo
  -> navigator.credentials.get(...)
  -> encrypted direct mdoc response
  -> opened SMART response JSON
  -> validateResponseAgainstRequest(...)
```

## `core.ts`: transport-neutral model

Use `core.ts` when you need to build, parse, or validate SMART Check-in JSON
without browser, React, mdoc, or Android dependencies.

Main exports:

| Export | Use |
| --- | --- |
| `SmartCheckinRequest` | Request model sent by a verifier/requester. |
| `SmartCheckinRequestItem` | One requested unit of information or questionnaire input. |
| `SmartCheckinContentSelector` | `fhir.resources` or `questionnaire` selector. |
| `SmartCheckinResponse` | Response model returned by a wallet/responder. |
| `SmartArtifact` | One returned artifact, such as FHIR JSON or SMART Health Card. |
| `validateSmartCheckinRequest(value)` | Runtime shape validation for untrusted request JSON. |
| `validateSmartCheckinResponse(value)` | Runtime shape validation for untrusted response JSON. |
| `validateResponseAgainstRequest(request, response)` | Cross-checks response IDs/status/artifact references against the original request. |

Example request:

```ts
import {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "./core.ts";

const request: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "clinic-checkin-123",
  purpose: "Clinic check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "us-core",
      title: "US Core clinical summary",
      summary: "Any resources matching US Core profiles that help with check-in.",
      required: true,
      content: {
        kind: "fhir.resources",
        profilesFrom: ["http://hl7.org/fhir/us/core"],
        profiles: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
        ],
      },
      accept: ["application/fhir+json"],
    },
    {
      id: "intake",
      title: "Headache intake form",
      content: {
        kind: "questionnaire",
        questionnaire: "https://example.org/fhir/Questionnaire/headache-intake|2026.04",
      },
      accept: ["application/fhir+json"],
    },
  ],
};

const validation = validateSmartCheckinRequest(request);
if (!validation.ok) throw new Error(validation.error);

const responseValidation = validateResponseAgainstRequest(request, maybeResponse);
if (!responseValidation.ok) throw new Error(responseValidation.error);
```

### Profiles and profile families

Use `profiles` when the requester needs specific StructureDefinitions:

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ]
}
```

Use `profilesFrom` when the requester means a profile family, such as "any
US Core profile":

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Wallets may satisfy a `profilesFrom` request with resources they can match to
that family. If `profiles` and `profilesFrom` are both present, they are
additive selectors: exact profiles highlight specific records of interest, but
do not limit the broader profile-family request. The core validator checks shape
only; actual holder-side matching belongs in wallet/store logic because it
depends on available patient data and profile knowledge.

## `dcapi-verifier.ts`: browser verifier flow

Use `dcapi-verifier.ts` when a web requester wants to call the browser's W3C
Digital Credentials API and receive a SMART Check-in response from a wallet.

Main exports:

| Export | Use |
| --- | --- |
| `detectDcApiSupport()` | Returns supported/unsupported state for the current browser. |
| `prepareDcapiCredentialRequest(options)` | Builds direct `org-iso-mdoc` request material and local open/inspect helpers. |
| `createDcapiVerifier(options)` | Convenience browser-local verifier wrapper. |
| `createBrowserLocalVerifierAuthority(options)` | `VerifierAuthority` implementation that keeps HPKE private material in browser memory. |
| `VerifierAuthority` | Interface for browser-local, server-owned, or other verifier authority implementations. |
| `requestCredentialWithAuthority(options)` | Runs prepare -> `navigator.credentials.get` -> complete. |
| `publicVerifierArtifacts(artifacts)` | Redacts private verifier key material for public/debug-safe prepared artifacts. |
| `credentialToDebugJson(credential)` | Normalizes browser credential objects for logging/debug UI. |

Quick start for the current browser-local demo model:

```ts
import {
  createBrowserLocalVerifierAuthority,
  requestCredentialWithAuthority,
} from "./dcapi-verifier.ts";
import type { SmartCheckinRequest } from "./core.ts";

const authority = createBrowserLocalVerifierAuthority({
  origin: location.origin,
});

const result = await requestCredentialWithAuthority({
  authority,
  request: smartRequest satisfies SmartCheckinRequest,
});

const smartResponse = result.completion.openedResponse.smartResponse;
```

The browser-local authority is useful for demos and static pages because the
same browser page builds the request, owns the HPKE private key, opens the
wallet response, and validates the SMART response.

## Verifier authority seam

The verifier authority seam is the contract that lets the demo be
browser-local today while leaving room for server-owned verifier crypto later.

```ts
const prepared = await authority.prepareCredentialRequest({ request });
const credential = await navigator.credentials.get(
  prepared.navigatorArgument as CredentialRequestOptions,
);
const completion = await authority.completeCredentialRequest({
  handle: prepared.handle,
  credential,
});
```

The important design point is that app/UI code does not need to know where
private verifier key material lives.

| Authority implementation | Private key material lives | Typical use |
| --- | --- | --- |
| `browser-local` | Browser memory | Static demo, same-device portal, local debugging. |
| `server-owned` | Backend/session store | Production-like verifier, audit trail, kiosk sessions. |
| Custom | Implementation-defined | Tests, native bridges, hosted relays. |

Sketch of a server-owned implementation:

```ts
import type {
  VerifierAuthority,
  VerifierCredentialCompletion,
  VerifierPreparedCredentialRequest,
} from "./dcapi-verifier.ts";

export function createServerVerifierAuthority(baseUrl: string): VerifierAuthority {
  return {
    kind: "server-owned",

    async prepareCredentialRequest({ request }): Promise<VerifierPreparedCredentialRequest> {
      const res = await fetch(`${baseUrl}/credential-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request }),
      });
      if (!res.ok) throw new Error(`prepare failed: ${res.status}`);
      return await res.json();
    },

    async completeCredentialRequest({ handle, credential }): Promise<VerifierCredentialCompletion> {
      const res = await fetch(`${baseUrl}/credential-requests/${handle}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) throw new Error(`complete failed: ${res.status}`);
      return await res.json();
    },
  };
}
```

In that server-owned version, the browser receives public request material and
an opaque `handle`; the backend stores HPKE private key material and opens the
uploaded credential response.

## `kiosk-session.ts`: QR request descriptors

Use `kiosk-session.ts` to describe cross-device kiosk requests without choosing
a specific transport.

The descriptor answers: "what request is this phone joining, where is the relay
or return channel, and what should the phone display before invoking the wallet?"

Typical flow:

```text
Kiosk creates request descriptor
  -> encodes descriptor into URL fragment or QR payload
  -> phone opens portal
  -> portal decodes descriptor
  -> portal gets SMART request/context from relay or embedded demo state
  -> portal runs the normal verifier authority flow
  -> completion returns through the selected relay/transport
```

The helper is intentionally relay-agnostic. A Cloudflare Worker relay, local
WebSocket helper, camera QR return, or WebRTC double-QR flow can all use the
same descriptor shape.

## What belongs outside this SDK

Keep these out of the framework-neutral TypeScript SDK:

- React rendering policy and visual components, except in `react.tsx`.
- Backend persistence decisions.
- Production patient matching and clinical ingestion policy.
- mdoc byte-level implementation details beyond the verifier adapter surface.
- Concrete kiosk relay implementations until the transport choice is made.

## Validation

The SDK is covered by the repo's existing `rp-web` checks:

```sh
cd rp-web
bun test
bun run build
bunx tsc --noEmit --pretty false
```

The SDK tests include browser-local verifier authority behavior, injected
credential getters, public artifact redaction, response opening, and kiosk
descriptor round-trips.
