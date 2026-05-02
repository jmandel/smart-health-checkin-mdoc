# SMART Health Check-in over `org-iso-mdoc` — direct profile

## TL;DR

Skip OID4VP entirely. The DC API already gives us:

- **Verifier origin authentication** — the browser hands the wallet
  `callingAppInfo.origin`. That string is a real-world trust anchor (it's the
  origin in the URL bar) and we display it to the user.
- **Request integrity** — the mdoc SessionTranscript binds `(origin, nonce, RP
  HPKE pubkey)` into every signature.
- **Response confidentiality + integrity** — HPKE-sealed DeviceResponse, AAD-bound
  to the SessionTranscript, only openable by the verifier page that holds the
  ephemeral private key.

So we don't need:

- `well_known:` discovery / metadata fetch
- Signed Request Object JWTs / `jwks_uri` / signature verification
- A second ephemeral key for `client_metadata.jwks` (one HPKE key for transport
  is enough)
- JWE encryption of the inner payload
- `nonce` / `state` plumbing at the application layer (the mdoc nonce already
  binds the request)
- `response_uri`, `direct_post.jwt`, `response_code`, completion modes — none
  apply when the DC API is the channel

What we do need: a clean **request JSON** and a clean **response JSON**, each
carried as a `tstr` inside the mdoc envelope. That's it.

The legacy browser-shim flow with OID4VP/relay is archived under
`archive/legacy-oid4vp/`. It is historical context only for this project.

## Request shape (verifier → wallet)

A single JSON object, placed in the ItemsRequest's `requestInfo` map under the
key `smart_health_checkin`, encoded as a CBOR text string (we don't bother with
nested CBOR maps — JSON-in-tstr is simpler and parses with serde_json / cJSON):

```json
{
  "version": "1",
  "items": [
    { "id": "insurance",
      "profile": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
      "required": true },

    { "id": "patient",
      "profile": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient" },

    { "id": "vaccinations",
      "profile": "http://hl7.org/fhir/StructureDefinition/Immunization",
      "signing": ["shc_v1", "none"] },

    { "id": "intake",
      "questionnaire": {
        "resourceType": "Questionnaire",
        "title": "Migraine Check-in",
        "item": [ /* full FHIR Questionnaire, possibly multi-KB */ ]
      } }
  ]
}
```

Per-item fields:

| Field | Required | Notes |
| ----- | -------- | ----- |
| `id` | yes | Verifier-defined opaque string. Reused as the key in the response's `answers` map. |
| `profile` | mut.excl. | FHIR StructureDefinition canonical URL — wallet returns matching FHIR resources. |
| `questionnaire` | mut.excl. | Inline FHIR Questionnaire JSON — wallet renders it and returns a QuestionnaireResponse. |
| `questionnaireUrl` | mut.excl. | URL ref to a Questionnaire — wallet fetches, renders, returns. |
| `required` | optional | Default `false`. UX hint only; wallet may still allow user to skip. |
| `signing` | optional | Array of acceptable signing strategies; values from `["none", "shc_v1", "shc_v2"]`. Default `["none"]` (any). |
| `description` | optional | Human-readable explanation surfaced in consent UI. |

Exactly one of `profile` / `questionnaire` / `questionnaireUrl` per item.

The full request object can be tens of KB when Questionnaires are inlined. CBOR
text strings have no documented cap; we self-impose ~256 KB and prefer
`questionnaireUrl` for anything bigger.

## Response shape (wallet → verifier)

A single JSON object, placed as the `elementValue` of the lone IssuerSignedItem
in the DeviceResponse, also encoded as a CBOR text string:

```json
{
  "version": "1",
  "artifacts": [
    { "id": "a1", "type": "fhir_resource",
      "data": { "resourceType": "Coverage", "id": "...", "subscriberId": "..." } },

    { "id": "a2", "type": "fhir_resource",
      "data": { "resourceType": "Patient", "id": "...", "name": [...] } },

    { "id": "a3", "type": "shc",
      "data": "eyJhbGciOiJFUzI1NiIsImtpZCI6...."  /* SMART Health Card JWS */ },

    { "id": "a4", "type": "fhir_resource",
      "data": { "resourceType": "QuestionnaireResponse",
                "questionnaire": "<url-or-id>",
                "item": [ /* user's answers */ ] } }
  ],
  "answers": {
    "insurance":    ["a1"],
    "patient":      ["a2"],
    "vaccinations": ["a3"],
    "intake":       ["a4"]
  }
}
```

Two-part structure exactly as you described:

- **`artifacts`** — flat de-duplicated list. `id` is wallet-generated, scoped to
  this response. `type` is one of `"fhir_resource"`, `"shc"` (compact JWS),
  `"shl"` (smart-health-link string), or `"opaque"` (catch-all).
- **`answers`** — map from each request `item.id` to an array of artifact ids
  satisfying it. One artifact can answer multiple items (e.g., a Patient
  resource referenced by two requested profiles).

If the user declined an item, omit its key from `answers`. If a Questionnaire
was fully filled, return one artifact and put its id in `answers`. If partially
filled, return the partial QuestionnaireResponse and let the verifier decide.

A request item with no answer simply has no key in `answers` — there's no
explicit "declined" marker. Verifiers infer "user did not share" from absence.

## Why this is enough

Trust model walked through:

| Concern | How it's handled |
| ------- | --------------- |
| "Is this verifier really clinic.example.com?" | Browser sets `callingAppInfo.origin`. Wallet shows the origin in the consent UI. User decides. |
| "Is the response bound to this verifier session?" | mdoc SessionTranscript = (origin, nonce, RP HPKE pubkey). Wallet's DeviceAuth signs over it and HPKE uses it as AAD. The SMART request JSON is delivered by the browser/Credential Manager local channel; it is not separately JWT-signed. |
| "Can anyone else read the response?" | HPKE-sealed under the RP's ephemeral pubkey. Only the verifier page that generated the keypair can open it. |
| "Did the wallet really send this exact response?" | DeviceAuth COSE_Sign1 over the SessionTranscript. Self-signed (we explicitly don't care about issuer trust); MSO digests prevent in-flight modification. |
| "Is the response replay-resistant?" | Per-request nonce in the SessionTranscript; HPKE encapsulation is unique per response. |

That's the same set of guarantees the OID4VP wrapping was providing. We just
get them from the underlying DC API + ISO mdoc + HPKE machinery instead of
duplicating them at the application layer.

## What the wallet does, end to end

1. Matcher sees `docType == "org.smarthealthit.checkin"` → surfaces an entry.
2. User taps. Handler activity launches.
3. Handler decodes the CBOR `DeviceRequest`, pulls
   `requestInfo.smart_health_checkin` (a tstr) → `JSON.parse` → request object.
4. UI: shows `callingAppInfo.origin` prominently as the verifier identity.
   For each `items[i]`:
   - Shows `description` (if any) and the inferred kind ("Coverage from your
     insurer", "Demographics", "Questionnaire: Migraine Check-in", etc.)
   - For `profile`: shows matching local FHIR resources, lets user pick.
   - For `questionnaire` / `questionnaireUrl`: renders the form, lets user fill
     it (auto-pre-filling from local FHIR data where possible).
5. User confirms. Wallet builds the response JSON above.
6. Wallet builds the DeviceResponse:
   - `docType`: `"org.smarthealthit.checkin"`
   - One IssuerSignedItem with
     `elementIdentifier = "smart_health_checkin_response"`,
     `elementValue = <response JSON as tstr>`
   - Self-signed MSO + DeviceAuth signature over the SessionTranscript.
7. HPKE-seals the DeviceResponse under the RP's pubkey, AAD =
   SessionTranscript.
8. Returns `{"protocol":"org-iso-mdoc","data":"<base64url(sealed)>"}` via
   `PendingIntentHandler.setGetCredentialResponse`.

## What the verifier does, end to end

1. `await navigator.credentials.get(...)` → `{ protocol, data }`.
2. `data` → base64url-decode → HPKE-open with own private key + computed
   SessionTranscript → DeviceResponse CBOR.
3. CBOR-decode → walk to the lone IssuerSignedItem → `JSON.parse` its
   `elementValue` → response object.
4. Use `answers` to route artifacts back to the originating UI flows.

No JWE library required. No JWT verification required. No metadata fetch. The
verifier-side code is ~50 lines.
