# spec-example-02: Lab results (large multi-chunk)

A non-vaccination SHC: a DiagnosticReport with a comprehensive panel of
laboratory Observations (CBC, electrolytes, chemistry, urinalysis). Big
enough that the spec splits it across multiple QR-code chunks; here we only
care about the JWS itself.

- **Asserts:** DiagnosticReport plus ~50 Observations (LOINC-coded chemistry,
  hematology, urinalysis), 3 Specimens.
- **Issuer (`iss`):** https://spec.smarthealth.cards/examples/issuer
- **kid:** `3Kfdg-XwP-7gXyywtUfUADwBumDOPKMQx-iELL11W9s`
- **alg:** ES256

Why we want it: exercises a non-immunization content type and a much larger
payload (~3 KB JWS), which puts more strain on the deflate / base64url path
and confirms the wallet doesn't truncate.
