# Open questions

This file tracks only questions that still affect the active direct
`org-iso-mdoc` implementation. Older OpenID4VP/DCQL questions are archived under
`archive/openid4vp/`.

## 1. Production issuer trust

The current response uses demo/self-signed issuer material. We verify:

- COSE protected algs,
- x5chain parseability,
- `issuerAuth` ES256 signature,
- `deviceSignature` ES256 signature,
- MSO digest binding.

We do not yet have a production trust-chain policy. Decide whether SMART
Check-in needs IACA/VICAL-style trust, a SMART-specific trust registry, local
clinic enrollment, or "signature valid but issuer untrusted" handling.

## 2. Trusted-browser origin policy

The wallet needs arbitrary clinic web origins to call it, but it must only trust
origin values asserted by trusted browser packages. AndroidX
`CallingAppInfo.getOrigin(allowlistJson)` requires package/signature allowlisting;
there is no "trust every app to assert an origin" wildcard.

Current dev behavior dynamically builds an allowlist for the observed caller so
Chrome can populate `origin`. Production needs a curated trusted-browser list and
clear behavior when only an Android app package identity is available.

## 3. `requestInfo` size limits

The direct mdoc transport carries the SMART request as a JSON string in
`ItemsRequest.requestInfo`; the next payload shape uses
`requestInfo["org.smarthealthit.checkin.request"]`. A real Android run proves
`requestInfo` survives and is usable. We still need empirical size limits for:

- Chrome / Digital Credentials API,
- Android Credential Manager request transport,
- GMS matcher host,
- handler intent extras,
- Safari/WebKit if we pursue iOS.

Probe sizes should include realistic inline Questionnaire payloads.

## 4. Real Safari / iOS feasibility

Android is proven end-to-end for this prototype. Mattr's direct `org-iso-mdoc`
branch was observed with Chromium using Safari-like identities, not real WebKit.

Still unknown:

- whether real Safari emits the same direct mdoc request shape for third-party
  wallets,
- whether iOS wallet APIs expose `requestInfo`,
- whether a third-party iOS wallet can register a custom docType such as
  `org.smarthealthit.checkin.1`.

## 5. Production wallet data and user input

The demo wallet uses fixture-backed FHIR resources and canned Questionnaire
answers. Production needs:

- a real holder data source,
- profile-aware resource matching,
- user-editable Questionnaire answers,
- explicit behavior for required items the user declines,
- policy for `signing` hints such as `none` and `shc_v1`.

## 6. External verifier acceptance

The repo's oracles prove internal byte correctness, COSE signature validity, and
SMART payload placement. We still need external verifier testing once a verifier
exists that understands `org.smarthealthit.checkin.1`.

Expected outcomes:

- classify demo self-signed issuer behavior,
- confirm `DeviceResponse` acceptance or identify stricter mdoc requirements,
- document any production trust-chain requirements.
