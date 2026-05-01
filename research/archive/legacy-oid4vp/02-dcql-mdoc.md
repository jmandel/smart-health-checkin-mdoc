# Archived: DCQL for mso_mdoc

This file is historical reference material. The active SMART Health Check-in
design does not use DCQL; it uses direct JSON in
`ItemsRequest.requestInfo.smart_health_checkin` as described in
`../../07-smart-checkin-on-mdoc.md`.

Captured from OpenID4VP draft 24 (`openid-4-verifiable-presentations-1_0-24`),
`digitalcredentials.dev/docs/requesting-credential/dcql/`, and the existing
`../matcher/request.json` for the legacy shape.

## Spec-current shape (final OpenID4VP 1.0 / draft 24+)

```json
{
  "credentials": [
    {
      "id": "mDL",
      "format": "mso_mdoc",
      "meta": { "doctype_value": "org.iso.18013.5.1.mDL" },
      "claims": [
        { "path": ["org.iso.18013.5.1", "given_name"]   },
        { "path": ["org.iso.18013.5.1", "family_name"]  },
        { "path": ["org.iso.18013.5.1", "age_over_21"]  }
      ]
    }
  ]
}
```

Rules per §7.2 of OpenID4VP:
- `format` for ISO mdoc is the literal string `mso_mdoc`.
- `meta.doctype_value` is the DocType string the wallet must match.
- For mdoc, **claim paths are exactly two strings**: `[namespace, element_id]`.
- A `claim_sets` field (sibling of `claims`) can express alternative combinations;
  ignore in v1.

## Legacy shape (still seen in some emitters incl. CMWallet's `request.json`)

```json
{
  "credentials": [{
    "id": "mDL_request",
    "format": "mso_mdoc",
    "meta": { "doctype_value": "org.iso.18013.5.1.mDL" },
    "claims": [
      { "namespace": "org.iso.18013.5.1", "claim_name": "family_name" }
    ]
  }]
}
```

Our matcher must accept both — translate `{namespace, claim_name}` → `path`.

## Our SMART-Health-IT-flavored use

Same envelope, our doctype + namespace + element-ids:

```json
{
  "credentials": [{
    "id": "smart-health-checkin",
    "format": "mso_mdoc",
    "meta": { "doctype_value": "org.smarthealthit.checkin" },
    "claims": [
      { "path": ["org.smarthealthit.checkin",
                 "fhir:profile:aHR0cDovL2hsNy5vcmcvZmhpci9TdHJ1Y3R1cmVEZWZpbml0aW9uL1BhdGllbnQ"] },
      { "path": ["org.smarthealthit.checkin",
                 "fhir:questionnaire:aHR0cHM6Ly9leGFtcGxlLm9yZy9RL2luLXRha2UtdjE"] }
    ]
  }]
}
```

The element-id strings are intentionally long — they encode RP intent. mdoc spec does
not cap their length; some parsers might. We'll cap at 1 KB per identifier as a
self-imposed limit and document.

## Matcher's required reading

For each `credentials[i]`:

1. `format` must equal `mso_mdoc` (skip otherwise).
2. Trigger if either holds:
   - `meta.doctype_value == "org.smarthealthit.checkin"`, OR
   - any `claims[j].path[0] == "org.smarthealthit.checkin"`
   - (legacy fallback: `claims[j].namespace == "org.smarthealthit.checkin"`)
3. Collect all element-ids (`path[1]` or `claim_name`) for display in the consent UI.

## Things DCQL allows that we ignore

- `intent_to_retain` (boolean per claim) — we surface all claims and let the user
  decide regardless.
- `values` (array of acceptable values) — only meaningful for elements with finite
  domains; not relevant here.
- `claim_sets` — combinatoric sets of acceptable claims; future work.
- `trusted_authorities` — issuer trust filter; we self-attest, so always violates,
  but verifiers that send this against our doctype probably aren't talking to us.
