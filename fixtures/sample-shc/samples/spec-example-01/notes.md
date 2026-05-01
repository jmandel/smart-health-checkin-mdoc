# spec-example-01: COVID-19 vaccination signed by the x5c-bound key

Same FHIR content as `spec-example-00` (three COVID-19 immunizations for John B.
Anyperson) but signed with the issuer's *second* JWK — the one carrying an
`x5c` X.509 chain. This is the canonical "x5c branch" sample.

- **Subject (synthetic):** John B. Anyperson
- **Asserts:** Three COVID-19 immunizations (CVX 207, 207, 229)
- **Issuer (`iss`):** https://spec.smarthealth.cards/examples/issuer
- **kid:** `EBKOr72QQDcTBUuVzAzkfBTGew0ZA16GuWty64nS-sw`
- **alg:** ES256

Why we want it: confirms the wallet verifies signatures directly against a
JWK whose entry also has an `x5c`, without requiring chain validation.
