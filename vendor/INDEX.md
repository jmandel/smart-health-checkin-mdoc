# Reference source index

Pinned source versions are listed in `sources.lock.json`. Paths below are
relative to each fetched repo under `vendor/_src/<id>/`.

## OpenWallet Foundation Multipaz

Primary role: mirror the direct Digital Credentials API mdoc flow and Android /
Kotlin response construction.

| Behavior | Upstream path | What to mirror |
| -------- | ------------- | -------------- |
| Direct DC API protocol dispatch | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` | Accept both `org.iso.mdoc` and `org-iso-mdoc`; route direct mdoc to the mdoc API handler. |
| `EncryptionInfo` parsing | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` | Decode `data.encryptionInfo`, require first array item `dcapi`, read `recipientPublicKey` as COSE_Key. |
| Direct `dcapi` SessionTranscript | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` | Build `dcapiInfo = CBOR([encryptionInfoBase64, origin])`, hash it, then build `[null, null, ["dcapi", digest]]`. |
| DeviceRequest verification | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` and `multipaz/src/commonMain/kotlin/org/multipaz/mdoc/request/DeviceRequest.kt` | Decode the request and verify reader authentication against the same SessionTranscript when present. |
| Presentment response generation | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` and `multipaz/src/commonMain/kotlin/org/multipaz/presentment/mdocPresentment.kt` | Use request + selected documents + SessionTranscript to produce a `DeviceResponse`. |
| HPKE direct response wrapper | `multipaz/src/commonMain/kotlin/org/multipaz/presentment/digitalCredentialsPresentment.kt` | Seal `CBOR(DeviceResponse)` with P-256/HKDF-SHA256/AES-128-GCM and encode `CBOR(["dcapi", {"enc", "cipherText"}])`. |
| DeviceResponse shape | `multipaz/src/commonMain/kotlin/org/multipaz/mdoc/response/DeviceResponseGenerator.kt` | Top-level `{version:"1.0", documents:[...], status}` and `issuerSigned` / `deviceSigned` document layout. |
| Document + DeviceAuth | `multipaz/src/commonMain/kotlin/org/multipaz/mdoc/response/DocumentGenerator.kt` | `DeviceAuthentication = ["DeviceAuthentication", SessionTranscript, docType, DeviceNameSpacesBytes]`, tag-24 wrapping, `deviceSignature` / `deviceMac`. |
| MSO generation | `multipaz/src/commonMain/kotlin/org/multipaz/mdoc/mso/MobileSecurityObjectGenerator.kt` | MSO fields: `version`, `digestAlgorithm`, `docType`, `valueDigests`, `deviceKeyInfo`, `validityInfo`. |
| DeviceResponse tests | `multipaz/src/commonTest/kotlin/org/multipaz/mdoc/response/DeviceResponseGeneratorTest.kt` | Test structure for ECDSA, MAC, issuer-signed, device-signed, and do-not-send cases. |
| Direct DC API tests | `multipaz/src/commonTest/kotlin/org/multipaz/presentment/digitalCredentialsPresentmentTest.kt` | End-to-end presentment tests and response inspection patterns. |
| HPKE test vectors | `multipaz/src/commonTest/kotlin/org/multipaz/crypto/HpkeTests.kt` and `multipaz/src/jvmTest/kotlin/org/multipaz/crypto/HpkeTestsAgainstTink.kt` | HPKE RFC vectors and Tink interop checks. |

## IdentityPython pyMDOC-CBOR

Primary role: independent oracle for issuer-signed bytes and MSO / COSE issuer
auth. This project does not cover direct DC API SessionTranscript, DeviceAuth,
or HPKE.

| Behavior | Upstream path | What to mirror or validate |
| -------- | ------------- | -------------------------- |
| IssuerSignedItem bytes | `pymdoccbor/mso/issuer.py` | `digestID`, random bytes, `elementIdentifier`, `elementValue`, tag-24 wrapper, and exact digest input bytes. |
| MSO + issuerAuth signing | `pymdoccbor/mso/issuer.py` | MSO payload construction, tag-24 MSO bytes as COSE_Sign1 payload, x5chain header placement. |
| Full document assembly | `pymdoccbor/mdoc/issuer.py` | `issuerSigned.nameSpaces`, `issuerAuth`, top-level document fields. |
| MSO verification | `pymdoccbor/mso/verifier.py` | COSE_Sign1 verification and `valueDigests` recomputation for disclosed items. |
| Document parse/walk | `pymdoccbor/mdoc/verifier.py` | How verifier walks documents and unwraps `IssuerSignedItem` entries. |

## Auth0 Lab `@auth0/mdl`

Primary role: TypeScript mdoc model and DeviceAuth sanity reference, not the
direct `dcapi` transport source of truth.

| Behavior | Upstream path | What to use |
| -------- | ------------- | ----------- |
| DeviceResponse builder | `src/mdoc/model/DeviceResponse.ts` | TS model for selecting issuer-signed items, adding device namespaces, and producing `deviceAuth`. |
| DeviceAuthentication helper | `src/mdoc/utils.ts` | `["DeviceAuthentication", sessionTranscript, docType, nameSpaces]` construction and MAC/signature helper patterns. |
| Top-level mdoc encoding | `src/mdoc/model/MDoc.ts` | Top-level `{version, documents, status}` response model. |

## Google `mdoc-credential`

Primary role: archived Android Credential Manager and HPKE/Tink reference.
Use for HPKE and legacy flow context, not for our direct `dcapi`
SessionTranscript.

| Behavior | Upstream path | What to use |
| -------- | ------------- | ----------- |
| Provider fulfillment | `example_app/src/main/java/com/google/mdoc/example/GetCredentialActivity.kt` | How an Android provider retrieves request context and returns Credential Manager response data. |
| HPKE with Tink | `example_app/src/main/java/com/google/mdoc/example/MdocHpke.kt` | P-256/HKDF-SHA256/AES-128-GCM HPKE setup and encrypt/decrypt mechanics. |
| Annex D vector | `example_app/src/main/java/com/google/mdoc/example/TestVectors.kt` | Generic ISO DeviceResponse fixture for parser sanity checks. |
