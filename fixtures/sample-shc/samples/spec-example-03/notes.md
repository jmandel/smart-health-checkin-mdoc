# spec-example-03: COVID-19 vaccination flagged for revocation testing

A short COVID-19 immunization SHC whose synthetic patient name "Johnny
Revoked" hints at the spec's intent for it to be used in revocation/CRL
exercises. Signed with the primary (non-x5c) key.

- **Subject (synthetic):** Johnny Revoked
- **Asserts:** Two COVID-19 immunizations (CVX 207, 207)
- **Issuer (`iss`):** https://spec.smarthealth.cards/examples/issuer
- **kid:** `3Kfdg-XwP-7gXyywtUfUADwBumDOPKMQx-iELL11W9s`
- **alg:** ES256

Why we want it: a third independent COVID-19 immunization card, smaller
than example-00 and useful as a generic happy-path vector. Despite the
"Revoked" naming, the card itself is currently a valid signed credential
(the JWKS does not list a `crlVersion` matching this kid's revocation),
so it functions as a normal good card unless a CRL test scenario pulls it
in explicitly.
