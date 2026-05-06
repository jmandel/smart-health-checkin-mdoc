# Wallet integration protocol

This document describes the integration contract used by the web-wallet side
surface. It is not a new SMART Health Check-in wire protocol: the outer
postMessage envelope is a generic Digital Credentials web-wallet shim, while the
reference demo currently handles `org-iso-mdoc` requests and returns the same
mdoc credential object opened by the existing verifier.

## Source selection

The verifier UI owns wallet choice. If the user chooses **Platform Wallet**, the
app calls the browser/platform `navigator.credentials.get` path. If the user
chooses a configured web wallet, the app calls that web wallet handle's
`credentials.get`. The web-wallet layer does not patch globals and does not know
whether Platform Wallet is enabled.

## Web-wallet tab/window transport

1. During the user's click, the verifier opens a child browsing context at
   `about:blank`.
2. The verifier installs its `message` listener, then navigates the child to the
   configured wallet URL.
3. The wallet posts a non-sensitive readiness signal to its opener:

    ```ts
    window.opener?.postMessage(
     { type: "digital-credentials/web-wallet/ready" },
     "*",
    );
    ```

   Because this message contains no request data and no session is established
   yet, it may use `targetOrigin: "*"`. It only says "this child window is
   loaded and ready to receive a request." The verifier still filters this
   message by `event.source === walletWindow` and `event.origin ===
   walletUrl.origin` before sending the request.

4. The verifier replies to the wallet window with `targetOrigin` set to
   `walletUrl.origin`:

   ```json
   {
     "type": "digital-credentials/web-wallet/request",
     "requestId": "opaque verifier nonce",
     "credentialRequestOptions": {
       "mediation": "required",
       "digital": {
         "requests": [
           {
             "protocol": "org-iso-mdoc",
             "data": {
               "deviceRequest": "<base64url CBOR DeviceRequest>",
               "encryptionInfo": "<base64url CBOR DCAPI encryptionInfo>"
             }
           }
         ]
       }
     }
   }
   ```

`credentialRequestOptions` is the verifier's `navigator.credentials.get(...)`
argument, or the supported Digital Credentials subset of it. The web-wallet
transport does not interpret protocol-specific `data`; it forwards the request
shape to the wallet so the wallet can dispatch on
`credentialRequestOptions.digital.requests[].protocol`.

The request message establishes the session. The wallet reads
`MessageEvent.origin` from this inbound request, displays that origin to the
user during consent, and stores it as `verifierOrigin` for the session. The
wallet can accept requests from any non-opaque web origin if it follows that
rule; an allowlist is a product policy choice, not a protocol requirement. Do
not trust an origin string carried inside the message payload.

Wallet-side sketch:

```ts
let activeSession:
  | {
      verifierWindow: WindowProxy;
      verifierOrigin: string;
      requestId: string;
      credentialRequestOptions: CredentialRequestOptions;
    }
  | undefined;

window.addEventListener("message", (event) => {
  if (event.source !== window.opener) return;
  if (event.data?.type !== "digital-credentials/web-wallet/request") return;

  const verifierOrigin = event.origin; // browser-stamped, not payload-provided
  if (verifierOrigin === "null") return;

  activeSession = {
    verifierWindow: event.source as WindowProxy,
    verifierOrigin,
    requestId: event.data.requestId,
    credentialRequestOptions: event.data.credentialRequestOptions,
  };

  renderConsentScreen({ verifierOrigin });
});
```

Opaque `"null"` origins are not suitable for this flow because the wallet cannot
send the response with an exact `targetOrigin`; reject them or require the
verifier to run from an `http`/`https` origin.

## Wallet request handling and protocol dispatch

The wallet inspects `credentialRequestOptions.digital.requests[]`, chooses a
request whose `protocol` it supports, and hands that request's `data` to the
corresponding protocol handler. The web-wallet envelope is intentionally generic:
future wallets can support additional Digital Credentials protocols without
changing the outer message types or the popup/origin handshake.

The reference demo wallet currently supports `protocol: "org-iso-mdoc"`. For
that request, it decodes `data.deviceRequest`, reads the SMART request from
`ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, and verifies it
is asking for the expected mdoc namespace/element. It then renders the request
items for consent:

- `selection.fhir`: match local FHIR records against resource-type, `profiles`,
  and `profilesFrom` selectors.
- `form.fhir`: render the inline FHIR `Questionnaire` when present and collect
  answers. If only `questionnaireCanonical` is present, the wallet can return a
  completed `QuestionnaireResponse` with no inline item answers, or decline /
  report unsupported by policy.

The SMART response placed inside the mdoc element is:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<SMART request id>",
  "artifacts": [
    {
      "id": "art-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["item-id"],
      "value": {}
    }
  ],
  "requestStatus": [
    { "item": "item-id", "status": "fulfilled" }
  ]
}
```

For FHIR record selections, `value` is normally a FHIR `Bundle` of selected
resources. For forms, `value` is a FHIR `QuestionnaireResponse` built from the
reviewed answers.

## Wallet response

On approval, the wallet posts back the credential object that
`navigator.credentials.get(...)` would have resolved with. For the demo mdoc
handler, the wallet builds a verifier-openable mdoc `DeviceResponse`, seals it
using the selected request's `data.encryptionInfo`, and posts back to the same
window that sent the request with `targetOrigin` set to the stored
`verifierOrigin`:

```ts
const session = activeSession;
if (!session) throw new Error("No active verifier session");

const credential = await buildCredential({
  deviceRequest: selectedOrgIsoMdoc.data.deviceRequest,
  encryptionInfo: selectedOrgIsoMdoc.data.encryptionInfo,
  origin: session.verifierOrigin, // transcript binding uses same origin
  smartResponse,
});

session.verifierWindow.postMessage(
  {
    type: "digital-credentials/web-wallet/response",
    requestId: session.requestId,
    outcome: "approved",
    credential: {
      protocol: "org-iso-mdoc",
      data: {
        response: credential.response,
      },
    },
  },
  session.verifierOrigin,
);
```

On cancellation or failure, post the same `type` and `requestId` with one of:

```json
{ "outcome": "declined" }
{ "outcome": "error", "message": "human-readable error" }
```

The verifier drops messages from the wrong origin or window, drops mismatched
`requestId` values, validates that the approved credential names a requested
protocol and has protocol data, and then hands the credential to the normal
verifier completion path. The wallet should likewise use the stored
`verifierOrigin` for all declined/error/closed responses after the session is
established.

Legacy demo builds used SMART-specific outer message types and top-level
`deviceRequest` / `encryptionInfo` fields. New integrations should use
`digital-credentials/web-wallet/*` message types and `credentialRequestOptions`.
The reference wallet may accept the old request shape during transition, but the
generic envelope is the forward-compatible contract.


## Native/mobile wallet mapping

A native wallet integrated through Android Credential Manager or another
platform DC API does not use `postMessage`, `about:blank`, or a web-wallet
handle. It receives the same logical `deviceRequest` and `encryptionInfo` from
the platform credential request, applies the same consent/data rules above, and
returns the same credential shape:

```json
{ "protocol": "org-iso-mdoc", "data": { "response": "<base64url envelope>" } }
```

For transcript binding, use the verifier origin supplied by the platform/browser
credential request. Do not substitute a self-reported app name or URL.
