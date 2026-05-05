# SmartHealthCheckin

A Swift Package implementing **[SMART Health Check‑in 1.0](https://joshuamandel.com/smart-health-checkin-mdoc/llms.txt)** — a same‑device W3C Digital Credentials API protocol for clinical check‑in, layered on top of `org-iso-mdoc` (CBOR + COSE_Sign1 + HPKE).

The package exposes both **Verifier** (clinic / kiosk) and **Wallet** (patient app) roles, plus the underlying primitives (clinical model, deterministic CBOR, COSE_Sign1, HPKE binding, x509) so applications can compose their own flows.

> **Status:** spec-complete. Round-trips against the [official demo's published `DigitalCredentialsRequest`](./sample.json) — every CBOR / COSE / HPKE byte boundary is byte-compatible.

## Requirements

- Swift 5.9+
- iOS 17 / macOS 14 / Mac Catalyst 17 / tvOS 17 / watchOS 10 / visionOS 1
  - These minimums are required for [HPKE](https://datatracker.ietf.org/doc/html/rfc9180) in CryptoKit.
- On Apple platforms, [`swift-crypto`](https://github.com/apple/swift-crypto) re-exports CryptoKit so there is no runtime cost; on Linux the same APIs are used so `swift test` works portably.

## Install

```swift
.package(url: "https://github.com/joshuamandel/smart-health-checkin-ios.git", from: "0.1.0")
```

Then, depending on what you need:

```swift
.target(
    name: "MyApp",
    dependencies: [
        .product(name: "SmartHealthCheckin", package: "smart-health-checkin-ios"),
    ]
)
```

Targets exposed (use the most specific one you need):

| Library                                         | What you get                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `SmartHealthCheckin`                            | High-level `CheckinVerifier` / `CheckinWallet` facades             |
| `SmartHealthCheckinModel`                       | §5/§6 clinical JSON model + strict parser + §6.4 cross‑validation  |
| `SmartHealthCheckinCBOR`                        | Deterministic CBOR codec, Tag(24) helpers, byte-range slice extraction |
| `SmartHealthCheckinMdoc`                        | COSE_Key, COSE_Sign1, SessionTranscript, DeviceRequest/Response, HPKE wrappers, x509 cert helpers |

## Verifier (clinic / kiosk)

```swift
import SmartHealthCheckin
import SmartHealthCheckinModel

let request = SmartHealthCheckinRequest(
    id: "checkin-2025-01",
    items: [
        .init(
            id: "imm",
            title: "Immunization history",
            content: .selectionFhir(.init(
                profiles: ["http://hl7.org/fhir/StructureDefinition/Immunization"]
            )),
            accept: [SmartHealthCheckinConstants.mediaTypeSmartHealthCard]
        )
    ]
)

// 1. Build the request to send through the W3C DC API.
let made = try CheckinVerifier.makeRequest(smartRequest: request)
// made.deviceRequestBase64Url, made.encryptionInfoBase64Url
// → pass these into navigator.credentials.get({ digital: { requests: [...] } }) on the page

// 2. After the DC API returns, open the response. `origin` MUST be the
//    page's authenticated origin (the same one the browser bound the call to).
let result = try CheckinVerifier.openResponse(
    retainedState: made.retainedState,
    origin: "https://clinic.example",
    dcapiResponseBase64Url: dcapiResponse,
    trustedIssuerKeys: clinicTrustList // [P256.Signing.PublicKey]
)

// 3. Apply your app's policy.
guard result.issuerSignatureValid,
      result.deviceSignatureValid,
      result.valueDigestMatches,
      !result.crossValidation.hasErrors else { /* reject */ return }

let smartResponse: SmartHealthCheckinResponse = result.smartResponse
```

`VerifierResponseResult` deliberately reports each cryptographic boundary separately (`issuerSignatureValid`, `deviceSignatureValid`, `valueDigestMatches`, plus `crossValidation` for §6.4). Most apps should make policy on the individual signals; `result.allChecksPass` is provided as a convenience but is rarely the right gate.

### Reader-authenticated requests

The kiosk can sign the request with a known reader key:

```swift
let made = try CheckinVerifier.makeRequest(
    smartRequest: request,
    readerSigningKey: readerKey,                 // P256.Signing.PrivateKey
    readerCertificateChain: [readerLeafCertDER], // optional x5chain
    origin: "https://clinic.example"
)
```

## Wallet (patient app)

```swift
import SmartHealthCheckin

let parsed = try CheckinWallet.handleRequest(
    deviceRequestBase64Url: deviceRequestB64u,
    encryptionInfoBase64Url: encryptionInfoB64u,
    origin: "https://clinic.example"   // browser-supplied
)

// Surface parsed.parsed.smartRequest to the user UI for consent…

// Optional: verify readerAuth against your trust list.
let st = SessionTranscript.dcapi(
    encryptionInfoBase64Url: encryptionInfoB64u, origin: "https://clinic.example"
)
let readerOK = CheckinWallet.verifyReaderAuth(
    parsed.parsed,
    sessionTranscript: st,
    trustedReaderKeys: walletTrustedReaders
)

// Build the response with the user's selected artifacts.
let smartResponse = SmartHealthCheckinResponse(
    requestId: parsed.parsed.smartRequest.id,
    artifacts: [
        .smartHealthCard(.init(id: "shc1", fulfills: ["imm"], verifiableCredentials: [shcJWS]))
    ],
    requestStatus: [.init(item: "imm", status: .fulfilled)]
)
let dcapiResponseB64u = try parsed.assembler.reply(
    smartResponse: smartResponse,
    issuerKey: credentialIssuerKey,        // P256.Signing.PrivateKey
    deviceKey: credentialDeviceKey,        // P256.Signing.PrivateKey
    issuerCertificateChain: [issuerLeafDER]
)
// → return this as the dcapi response
```

## Lower layers

If you need to compose your own flow, every primitive is reachable:

```swift
import SmartHealthCheckinCBOR
import SmartHealthCheckinMdoc

let st = SessionTranscript.dcapi(
    encryptionInfoBase64Url: encInfoB64u, origin: origin
)
let sealed = try CheckinHPKE.seal(
    plaintext: deviceResponseBytes,
    recipientPublicKey: recipientKey,
    info: st
)
```

The CBOR codec provides byte-range slice extraction so you can hash exactly what was on the wire (mdoc `IssuerSignedItem` digests are taken over the **received** `Tag(24, bstr)` wrapper bytes, never a re-encoded form):

```swift
let decoded = try CBORDecoder.lenient.decodeWithSlices(deviceResponseBytes)
let itemSlice = try decoded.slice(at: [
    .key(.textString("documents")),
    .index(0),
    .key(.textString("issuerSigned")),
    .key(.textString("nameSpaces")),
    .key(.textString("org.smarthealthit.checkin")),
    .index(0),
])
let digest = SHA256.hash(data: itemSlice.source)
```

## Spec compliance notes

The library bakes in the spec's load‑bearing details:

- Identifiers are fixed: docType `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, request carrier key `org.smarthealthit.checkin.request`.
- The SMART JSON request body sits in `requestInfo[carrierKey]` as a CBOR **text string** (not a map, not base64url) per §8.2.
- §5.1 strictness: the JSON parser rejects duplicate object members. Foundation's `JSONDecoder` and `JSONSerialization` silently accept them; the library does not use them.
- COSE_Sign1 ES256 signatures are raw `R || S` (64 bytes), not DER.
- `issuerAuth` payload is `Tag(24, bstr .cbor MSO)` (attached). `deviceSignature` payload is `Tag(24, bstr .cbor DeviceAuthentication)` (attached). `readerAuth` payload is **detached** — the COSE payload field is `nil`, the receiver reconstructs `ReaderAuthentication` from `SessionTranscript` + `ItemsRequestBytes`.
- Map ordering is RFC 8949 deterministic; non-shortest int / length encodings are rejected.
- HPKE: DHKEM(P‑256, HKDF‑SHA256) + HKDF‑SHA256 + AES‑128‑GCM, `info = SessionTranscript`, `aad = h''`, base mode.
- `DeviceAuthentication` binds the **exact** received `deviceSigned.nameSpaces` tag‑24 bytes — the library does not hardcode `{}`.
- §6.4 cross‑validation: every `requestStatus` item ID exists in the request, every artifact's `mediaType` is in its target item's `accept[]`, etc.

## Testing

```sh
swift test
```

47 tests covering the model layer, CBOR determinism + slice extraction, COSE_Sign1 round‑trip, HPKE seal/open, DeviceRequest + DeviceResponse build/parse with positive and negative cases, and a Verifier ↔ Wallet integration round‑trip. Plus a fixture test that decodes the actual demo's published `DigitalCredentialsRequest` (`sample.json`) and verifies its `readerAuth` COSE_Sign1 against the embedded leaf cert — this is the strongest proof that the library is byte-compatible with the demo wire format.

```
$ swift test --filter SampleFixtureTests
…
Test Case 'SampleFixtureTests.testReaderAuthVerifiesAgainstLeafCert' started …
readerAuth verified against origin: https://joshuamandel.com
…
Executed 4 tests, with 0 failures
```

## Threat model & responsibilities

The library implements the protocol; production deployments still need to:

- Manage trust roots — supply real `trustedIssuerKeys` (or chain validation) instead of relying on the embedded leaf cert.
- Bind to the authenticated origin from the platform credential manager / browser. Never accept an origin from inside the SMART JSON body.
- Treat the verifier's `VerifierRetainedState` as ephemeral session state. Rotate per request.
- Apply policy on `validityInfo` (`signed`, `validFrom`, `validUntil`).
- Handle `intentToRetain = false` semantics in your data layer.

## License

MIT.
