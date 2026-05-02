# Sources used in this research

Last fetched: April 2026.

## Primary specs

- W3C Digital Credentials TR — https://www.w3.org/TR/digital-credentials/
- W3C-FedID Digital Credentials editor's draft — https://w3c-fedid.github.io/digital-credentials/
- OpenID for Verifiable Presentations draft 24 — https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html
- OpenID for Verifiable Presentations editor's draft (newer) — https://openid.github.io/OpenID4VP/openid-4-verifiable-presentations-wg-draft.html
- ISO/IEC 18013-5:2021 (MSO, IssuerSigned, DeviceSigned) — https://www.iso.org/standard/69084.html (paywalled; relevant pieces transcribed in `04-mdoc-response.md`)
- ISO/IEC 18013-7 Annex C (online presentation) — referenced via google/mdoc-credential

## Browser / platform docs

- Chrome 141 DC API GA — https://developer.chrome.com/blog/digital-credentials-api-shipped
- Chrome DC API origin trial — https://developer.chrome.com/blog/digital-credentials-api-origin-trial
- Chromestatus — https://chromestatus.com/feature/5166035265650688
- Android Holder integration — https://developer.android.com/identity/digital-credentials/credential-holder
- Android DC overview — https://developer.android.com/identity/digital-credentials
- Jetpack credentials-registry — https://developer.android.google.cn/jetpack/androidx/releases/credentials-registry

## Community / how-tos

- digitalcredentials.dev wallet/Android — https://digitalcredentials.dev/docs/wallets/android/
- digitalcredentials.dev enable-wallet/Android — https://digitalcredentials.dev/docs/enable-wallet/android/
- digitalcredentials.dev DCQL — https://digitalcredentials.dev/docs/requesting-credential/dcql/
- W3C-FedID issue #36 (HOWTO prototype) — https://github.com/w3c-fedid/digital-credentials/issues/36
- WICG mirror of #36 — https://github.com/WICG/digital-credentials/issues/36
- Corbado: building a verifier — https://www.corbado.com/blog/how-to-build-verifiable-credential-verifier
- Corbado: 2026 status — https://www.corbado.com/blog/digital-credentials-api
- walt.id OpenID4VP guide — https://docs.walt.id/community-stack/concepts/data-exchange-protocols/openid4vp

## Reference implementations

- IdentityPython/pyMDOC-CBOR (generic mdoc Issuer/Verifier; Apache-2.0; the structural template for our TS verifier) — https://github.com/IdentityPython/pyMDOC-CBOR
- google/mdoc-credential (archived Oct 2024 — still useful for HPKE/handover code) — https://github.com/google/mdoc-credential
- digitalcredentialsdev/CMWallet (the C matcher POC the article describes; this is the working copy at `../../`) — https://github.com/digitalcredentialsdev/CMWallet
- jmandel/shl-wallet (Josh's separate Rust-matcher SHL wallet — the actual project he wrote about on LinkedIn) — https://github.com/jmandel/shl-wallet
- Local CMWallet matcher header (de-facto ABI reference) — `../../matcher/credentialmanager.h`
- Local CMWallet matcher example — `../../matcher/hardcoded_matcher.c`, `../../matcher/dcql.c`
- Local CMWallet sample DCQL request (legacy shape) — `../../matcher/request.json`
- Local mirror of shl-wallet Rust matcher — `shl-wallet-matcher_rs/matcher_rs_src_main.rs` (Cargo.toml + main.rs + README)
- Archived OID4VP/DCQL notes — `archive/legacy-oid4vp/` (historical context only)

## Background reading

- Original LinkedIn write-up by Josh Mandel (the source of the "magic string" and
  "WASI entropy" pain points we're designing around) — included verbatim in the
  conversation that generated this folder.
