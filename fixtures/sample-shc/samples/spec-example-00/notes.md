# spec-example-00: COVID-19 vaccination, multi-dose

Synthetic SMART Health Card from the spec's canonical issuer.

- **Subject (synthetic):** John B. Anyperson, DOB 1951-01-20
- **Asserts:** Three COVID-19 immunizations
  - 2021-01-01 - CVX 207 (Moderna mRNA-1273)
  - 2021-01-29 - CVX 207 (Moderna)
  - 2022-09-05 - CVX 229 (Moderna bivalent booster)
  - All performed at "ABC General Hospital"
- **Issuer (`iss`):** https://spec.smarthealth.cards/examples/issuer
- **kid:** `3Kfdg-XwP-7gXyywtUfUADwBumDOPKMQx-iELL11W9s`
- **alg:** ES256

Why we want it: simplest happy-path case. Standard immunization bundle, plain
JWKS-signed key (no x5c). Used as the primary smoke test for the wallet's
`application/smart-health-card` artifact branch.
