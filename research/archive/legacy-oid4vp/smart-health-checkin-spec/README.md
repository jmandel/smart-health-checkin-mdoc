# Archived: SMART Health Check-in Protocol — local copy of the upstream spec

This file is historical reference material. The current project does not
implement this OID4VP/browser-shim profile; it only borrows the
artifact/answers response pattern.

Source: <https://github.com/jmandel/smart-health-checkin-demo/blob/main/README.md>
Live demo: <https://smart-health-checkin.exe.xyz/>
Captured: 2026-04-30

This is the older OpenID4VP profile that originally motivated the mapping work.
It is saved here so the current direct mdoc design can cite the parts it borrows
without treating the rest as implementation guidance.

---

## 1. SMART Health Check-in Profile of OID4VP

This section defines the **Protocol Profile**, specifying how OID4VP is used to transport the request and response. To protect PHI in transit, **all responses SHALL be encrypted at the application layer and transported via a Verifier-controlled response endpoint.** A Verifier implementation can store opaque ciphertext for later retrieval, or it can deliver the encrypted response directly to a Verifier component that holds the decryption key.

### 1.1 Ephemeral Keys and Response Delivery

Before initiating a request, the Verifier SHALL:
1. Generate a fresh Ephemeral Key Pair (e.g., ECDH-ES using P-256 or X25519). The private key remains securely in the Verifier's control.
2. Produce a signed Request Object containing the ephemeral public key (see 1.4).

The `response_uri` in the signed Request Object SHALL be a request-specific, write-only Verifier-controlled endpoint.

`smart_health_checkin.completion`:
- `"redirect"` — same-device; response endpoint returns a `redirect_uri` with a fresh `response_code`.
- `"deferred"` — cross-device; response endpoint returns a simple acknowledgement.

### 1.2 Authenticated Verifier Discovery (`well_known:`)

`client_id` uses the `well_known:` Client Identifier Prefix, e.g.
`well_known:https://clinic.example.com`. Wallet resolves
`<origin>/.well-known/openid4vp-client` for metadata (incl. `jwks_uri`).

### 1.4 Authorization Request

Bootstrap (popup / QR):
```
client_id=well_known:https://clinic.example.com
request_uri=https://clinic.example.com/oid4vp/requests/123
```

Signed Request Object payload (the load-bearing piece):
```json
{
  "iss": "well_known:https://clinic.example.com",
  "aud": "https://self-issued.me/v2",
  "client_id": "well_known:https://clinic.example.com",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://clinic.example.com/oid4vp/responses/req_abc",
  "nonce": "...",
  "state": "req_abc",
  "smart_health_checkin": { "completion": "redirect" },
  "dcql_query": { ... },
  "client_metadata": {
    "jwks": { "keys": [{ "kty":"EC", "crv":"P-256", "use":"enc",
                          "alg":"ECDH-ES", "x":"...", "y":"..." }] },
    "encrypted_response_enc_values_supported": ["A256GCM"]
  }
}
```

### 1.5 Authorization Response

JSON `{ vp_token, state }` is JWE-encrypted with the ephemeral pubkey from
`client_metadata.jwks`, posted as `application/x-www-form-urlencoded` body
`response=<JWE>` to `response_uri`.

## 2. DCQL Profile

`format: "smart_artifact"`, `require_cryptographic_holder_binding: false`.

`meta` keys (any subset):
- `profile` — FHIR StructureDefinition canonical URL
- `questionnaire` — full FHIR Questionnaire JSON
- `questionnaireUrl` — URL ref alternative
- `signingStrategy` — array, values from `["none", "shc_v1", "shc_v2"]`

Optional credentials are expressed via `credential_sets` with `required: false`.

## 2.2 Response Structure (Inline References)

`vp_token` is a map from credential id → array of Presentation objects:

- **Full**: `{ artifact_id?, type: "fhir_resource"|"shc"|"shl", data: <payload> }`
- **Reference**: `{ artifact_ref: "<artifact_id>" }`

`artifact_id` is wallet-generated per response, scoped to the `vp_token`.

## Shim API (browser)

```js
import { request, completeSameDeviceRedirect, maybeHandleReturn } from 'smart-health-checkin';
await request(dcqlQuery, {
  walletUrl: 'https://picker.example.com',
  wellKnownClientUrl: 'https://clinic.example.com',
  flow: 'same-device' | 'cross-device',
  sameDeviceLaunch: 'replace'
});
```

Response shape (decrypted):
```js
{ state, vp_token, credentials /* rehydrated when rehydrate=true */ }
```

(Full upstream spec text is on GitHub — this is just the load-bearing summary
for the mdoc-mapping work.)
