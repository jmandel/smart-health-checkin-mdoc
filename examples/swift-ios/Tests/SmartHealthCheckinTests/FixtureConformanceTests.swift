// SPDX-License-Identifier: MIT
//
// Cross-implementation fixture conformance tests.
//
// These tests point the Swift library at the same `fixtures/` directory the
// TypeScript SDK, the Android Kotlin wallet, and the Python pyMDOC tooling
// already validate against. The goal is to surface divergences between the
// Swift impl and the spec / other reference impls — anything the Swift parser
// rejects that the others accept (or vice versa) is a candidate finding.
//
// Test strategy is *semantic* parity, NOT byte-equality on Swift outputs:
//   - Outputs from real wallets and verifiers carry random nonces, ECDSA k,
//     HPKE ephemeral keys, and timestamps. Byte-comparing those is brittle.
//   - SessionTranscript bytes ARE deterministic (a function of EI b64u + origin)
//     so we DO byte-compare those when a fixture pins them.
//
// All paths are relative to the SwiftPM package root (`examples/swift-ios/`).
//
// Coverage:
//   C1  ts-smart-checkin-basic       — synthetic TS-generated request
//   C2  ts-smart-checkin-readerauth  — TS-generated request with detached readerAuth
//   C3  real-chrome-android-…        — real captured Chrome+Android Credential Manager
//   C4  negative-mattr-mdl           — non-SMART mDL request must be rejected
//   C5  responses/real-chrome-…      — full HPKE-open + DeviceResponse + MSO + devSig
//   C6  responses/pymdoc-minimal     — Python pyMDOC issuer-only Document; verify
//                                      tag-24 IssuerSignedItem digest matches MSO.

import XCTest
import Crypto
@testable import SmartHealthCheckin
@testable import SmartHealthCheckinModel
@testable import SmartHealthCheckinMdoc
@testable import SmartHealthCheckinCBOR

final class FixtureConformanceTests: XCTestCase {

    // MARK: - Path helpers

    /// Repo-relative fixtures root. SwiftPM tests run from the package root,
    /// which is `examples/swift-ios/` → fixtures live two levels up.
    static let fixturesRoot: URL = {
        URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("../../fixtures")
            .standardizedFileURL
    }()

    static func fixture(_ relative: String) -> URL {
        fixturesRoot.appendingPathComponent(relative)
    }

    static func loadStrictJSON(_ url: URL) throws -> JSONValue {
        try JSONStrictParser.parse(Data(contentsOf: url))
    }

    /// Locate the `org-iso-mdoc` request entry inside a navigator-credentials-get
    /// argument JSON. Returns `(deviceRequestB64u, encryptionInfoB64u)`.
    ///
    /// Handles both top-level shapes that appear in the upstream fixture
    /// corpus. Note this is a *capture-point* divergence, not a wire-format
    /// divergence:
    ///   - Website-side capture (W3C DC API arg):
    ///       `{ "mediation": ..., "digital": { "requests": [...] }, "signal": ... }`
    ///   - Wallet-side capture (Android Credential Manager hands the wallet
    ///     only the inner slice):
    ///       `{ "requests": [...] }`
    /// A browser-side relying-party parser will only ever see the first shape.
    static func extractMdocData(_ navArg: JSONValue) throws -> (String, String) {
        guard case .object(let top) = navArg else { throw XCTestError(.failureWhileWaiting) }

        let reqArr: [JSONValue]
        if case .object(let dig) = top.first(where: { $0.key == "digital" })?.value ?? .null,
           case .array(let arr) = dig.first(where: { $0.key == "requests" })?.value ?? .null {
            reqArr = arr
        } else if case .array(let arr) = top.first(where: { $0.key == "requests" })?.value ?? .null {
            reqArr = arr
        } else {
            throw XCTestError(.failureWhileWaiting)
        }

        for case .object(let req) in reqArr {
            // Some fixtures omit `protocol` and rely on `data` shape; accept either.
            let protoMatch: Bool = {
                if case .string(let s) = req.first(where: { $0.key == "protocol" })?.value ?? .null {
                    return s == "org-iso-mdoc"
                }
                return true
            }()
            guard protoMatch,
                  case .object(let data) = req.first(where: { $0.key == "data" })?.value ?? .null,
                  case .string(let dr) = data.first(where: { $0.key == "deviceRequest" })?.value ?? .null,
                  case .string(let ei) = data.first(where: { $0.key == "encryptionInfo" })?.value ?? .null
            else { continue }
            return (dr, ei)
        }
        throw XCTestError(.failureWhileWaiting)
    }

    // MARK: - Skip-if-missing guard

    /// Skip a test (with a clear message) when the expected fixture isn't on
    /// disk — keeps the suite green for users running outside the upstream
    /// repo checkout.
    func requireFixture(_ url: URL, file: StaticString = #filePath, line: UInt = #line) throws {
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw XCTSkip("fixture not present at \(url.path) — skipping")
        }
    }

    // MARK: - Standard mdoc options

    static let mdocOptions = DeviceRequestBuilder.Options(
        docType: SmartHealthCheckinConstants.mdocDocType,
        namespace: SmartHealthCheckinConstants.mdocNamespace,
        element: SmartHealthCheckinConstants.mdocElementIdentifier,
        requestCarrierKey: SmartHealthCheckinConstants.mdocRequestCarrierKey,
        intentToRetain: true
    )

    static let validatorOptions = DeviceResponseValidator.Options(
        docType: SmartHealthCheckinConstants.mdocDocType,
        namespace: SmartHealthCheckinConstants.mdocNamespace,
        element: SmartHealthCheckinConstants.mdocElementIdentifier
    )

    // MARK: - Helpers for parsing requests + verifying readerAuth

    private struct ParsedRequestFixture {
        let deviceRequestB64u: String
        let encryptionInfoB64u: String
        let parsedRequest: CheckinDeviceRequest
        let smartRequestJSON: Data
        let sessionTranscriptBytes: Data
    }

    private func parseRequestFixture(_ dir: URL, origin: String) throws -> ParsedRequestFixture {
        let navArg = try Self.loadStrictJSON(dir.appendingPathComponent("request.json"))
        let (drB64u, eiB64u) = try Self.extractMdocData(navArg)
        let drBytes = try Base64URL.decode(drB64u)
        let parsed = try DeviceRequestParser.parse(drBytes, expecting: Self.mdocOptions)
        let dr = try XCTUnwrap(parsed.docRequests.first)
        let smartJSON = try XCTUnwrap(
            dr.itemsRequest.smartRequestJSON(carrierKey: SmartHealthCheckinConstants.mdocRequestCarrierKey),
            "request must carry SMART JSON in the carrier key slot"
        )
        let st = SessionTranscript.dcapi(encryptionInfoBase64Url: eiB64u, origin: origin)
        return ParsedRequestFixture(
            deviceRequestB64u: drB64u,
            encryptionInfoB64u: eiB64u,
            parsedRequest: parsed,
            smartRequestJSON: smartJSON,
            sessionTranscriptBytes: st
        )
    }

    /// Compare two JSON values for semantic equality, ignoring key order.
    private func assertJSONSemanticallyEqual(_ a: Data, _ b: Data, file: StaticString = #filePath, line: UInt = #line) throws {
        let av = try JSONSerialization.jsonObject(with: a, options: [.fragmentsAllowed])
        let bv = try JSONSerialization.jsonObject(with: b, options: [.fragmentsAllowed])
        let an = try JSONSerialization.data(withJSONObject: av, options: [.sortedKeys])
        let bn = try JSONSerialization.data(withJSONObject: bv, options: [.sortedKeys])
        if an != bn {
            let aStr = String(data: an, encoding: .utf8) ?? "<binary>"
            let bStr = String(data: bn, encoding: .utf8) ?? "<binary>"
            XCTFail("JSON not semantically equal:\nA: \(aStr)\nB: \(bStr)", file: file, line: line)
        }
    }

    // MARK: - C1: ts-smart-checkin-basic

    func testC1_ts_smart_checkin_basic() throws {
        let dir = Self.fixture("dcapi-requests/ts-smart-checkin-basic")
        try requireFixture(dir.appendingPathComponent("request.json"))
        let metadataURL = dir.appendingPathComponent("metadata.json")
        guard case .object(let m) = try Self.loadStrictJSON(metadataURL),
              case .string(let origin) = m.first(where: { $0.key == "origin" })?.value ?? .null
        else { return XCTFail("metadata missing origin") }

        let fixture = try parseRequestFixture(dir, origin: origin)
        let dr = try XCTUnwrap(fixture.parsedRequest.docRequests.first)
        XCTAssertEqual(dr.itemsRequest.docType, SmartHealthCheckinConstants.mdocDocType)
        XCTAssertNil(dr.readerAuth, "ts-smart-checkin-basic does not carry readerAuth")

        // Smart request semantic equality with smart-request.expected.json.
        let expected = try Data(contentsOf: dir.appendingPathComponent("smart-request.expected.json"))
        try assertJSONSemanticallyEqual(fixture.smartRequestJSON, expected)

        // SessionTranscript byte-equality — function of (EI b64u, origin), so deterministic.
        let stExpectedURL = dir.appendingPathComponent("session-transcript.cbor")
        if FileManager.default.fileExists(atPath: stExpectedURL.path) {
            let stExpected = try Data(contentsOf: stExpectedURL)
            XCTAssertEqual(fixture.sessionTranscriptBytes, stExpected,
                           "SessionTranscript bytes must match the canonical TS-generated transcript")
        }

        // Round-trip the embedded SMART request through the strict parser+validator.
        let parsed = try SmartHealthCheckinRequest.parse(fixture.smartRequestJSON)
        XCTAssertFalse(SmartHealthCheckinValidator.validate(request: parsed).hasErrors)
    }

    // MARK: - C2: ts-smart-checkin-readerauth

    func testC2_ts_smart_checkin_readerauth() throws {
        let dir = Self.fixture("dcapi-requests/ts-smart-checkin-readerauth")
        try requireFixture(dir.appendingPathComponent("request.json"))
        guard case .object(let m) = try Self.loadStrictJSON(dir.appendingPathComponent("metadata.json")),
              case .string(let origin) = m.first(where: { $0.key == "origin" })?.value ?? .null
        else { return XCTFail("metadata missing origin") }

        let fixture = try parseRequestFixture(dir, origin: origin)
        let dr = try XCTUnwrap(fixture.parsedRequest.docRequests.first)
        let readerAuth = try XCTUnwrap(dr.readerAuth, "ts-smart-checkin-readerauth must carry readerAuth")

        // Semantic SMART request equality.
        let expected = try Data(contentsOf: dir.appendingPathComponent("smart-request.expected.json"))
        try assertJSONSemanticallyEqual(fixture.smartRequestJSON, expected)

        // SessionTranscript byte-equality.
        let stExpected = try Data(contentsOf: dir.appendingPathComponent("session-transcript.cbor"))
        XCTAssertEqual(fixture.sessionTranscriptBytes, stExpected)

        // Verify detached readerAuth signature against the leaf certificate's key.
        let leafDER = try Data(contentsOf: dir.appendingPathComponent("reader-certificate.der"))
        let pub = try XCTUnwrap(X509Helper.p256PublicKey(fromCertificate: leafDER),
                                "reader-certificate.der must contain a P-256 SPKI")
        let payload = ReaderAuth.readerAuthenticationBytes(
            sessionTranscript: fixture.sessionTranscriptBytes,
            itemsRequestTag24Bytes: dr.itemsRequestTag24Bytes
        )
        try COSESign1Signer.verify(readerAuth, publicKey: pub, detachedPayload: payload)

        // Sanity: the detached payload our impl reconstructs matches the
        // fixture's pinned `reader-auth-detached-payload.cbor` if present.
        let detachedURL = dir.appendingPathComponent("reader-auth-detached-payload.cbor")
        if FileManager.default.fileExists(atPath: detachedURL.path) {
            let pinned = try Data(contentsOf: detachedURL)
            XCTAssertEqual(payload, pinned,
                           "ReaderAuthentication bytes must byte-match the canonical fixture")
        }
    }

    // MARK: - C3: real-chrome-android-smart-checkin (request side)

    func testC3_real_chrome_android_request() throws {
        let dir = Self.fixture("dcapi-requests/real-chrome-android-smart-checkin")
        try requireFixture(dir.appendingPathComponent("request.json"))
        guard case .object(let m) = try Self.loadStrictJSON(dir.appendingPathComponent("metadata.json")),
              case .string(let origin) = m.first(where: { $0.key == "origin" })?.value ?? .null
        else { return XCTFail("metadata missing origin") }

        let fixture = try parseRequestFixture(dir, origin: origin)
        let dr = try XCTUnwrap(fixture.parsedRequest.docRequests.first)

        // Smart request semantic equality.
        let expected = try Data(contentsOf: dir.appendingPathComponent("smart-request.expected.json"))
        try assertJSONSemanticallyEqual(fixture.smartRequestJSON, expected)

        // SessionTranscript byte-equality.
        let stExpected = try Data(contentsOf: dir.appendingPathComponent("session-transcript.cbor"))
        XCTAssertEqual(fixture.sessionTranscriptBytes, stExpected)

        // readerAuth: present per metadata.
        let readerAuth = try XCTUnwrap(dr.readerAuth, "Chrome+Android capture carries readerAuth")
        var leafDER: Data?
        for entry in readerAuth.unprotected {
            if case .unsigned(33) = entry.key {
                if case .byteString(let d) = entry.value { leafDER = d }
                else if case .array(let arr) = entry.value, case .byteString(let d) = arr.first ?? .null { leafDER = d }
            }
        }
        let leaf = try XCTUnwrap(leafDER, "Chrome readerAuth must carry x5chain")
        let pub = try XCTUnwrap(X509Helper.p256PublicKey(fromCertificate: leaf))
        let payload = ReaderAuth.readerAuthenticationBytes(
            sessionTranscript: fixture.sessionTranscriptBytes,
            itemsRequestTag24Bytes: dr.itemsRequestTag24Bytes
        )
        try COSESign1Signer.verify(readerAuth, publicKey: pub, detachedPayload: payload)
    }

    // MARK: - C4: negative-mattr-mdl

    func testC4_negative_mattr_mdl_is_rejected() throws {
        let captureDir = Self.fixture("captures/2026-04-30-mattr-safari-org-iso-mdoc")
        let navArgURL = captureDir.appendingPathComponent("navigator-credentials-get.arg.json")
        try requireFixture(navArgURL)

        let navArg = try Self.loadStrictJSON(navArgURL)
        let (drB64u, _) = try Self.extractMdocData(navArg)
        let drBytes = try Base64URL.decode(drB64u)

        // Strict parse with our SMART options must reject the mDL request — by
        // failing outright, OR by surfacing identifiers that don't match SMART.
        // The test fails only if a non-SMART request is silently accepted as SMART.
        do {
            let parsed = try DeviceRequestParser.parse(drBytes, expecting: Self.mdocOptions)
            for dr in parsed.docRequests {
                XCTAssertNotEqual(dr.itemsRequest.docType,
                                  SmartHealthCheckinConstants.mdocDocType,
                                  "Swift parser falsely accepted a non-SMART mDL request as SMART. " +
                                  "Android's parser rejects this with IllegalStateException(\"... not a SMART Health Check-in \")")
            }
        } catch {
            // Expected: parser rejected the wrong docType. Good.
        }
    }

    // MARK: - C5: full real-chrome-android response open + validate

    func testC5_real_chrome_android_response_full_open() throws {
        let reqDir = Self.fixture("dcapi-requests/real-chrome-android-smart-checkin")
        let respDir = Self.fixture("responses/real-chrome-android-smart-checkin")
        try requireFixture(reqDir.appendingPathComponent("request.json"))
        try requireFixture(respDir.appendingPathComponent("dcapi-response.cbor"))

        guard case .object(let reqMeta) = try Self.loadStrictJSON(reqDir.appendingPathComponent("metadata.json")),
              case .string(let origin) = reqMeta.first(where: { $0.key == "origin" })?.value ?? .null
        else { return XCTFail("missing origin") }

        // 1. Reconstruct the SessionTranscript from the request fixture.
        let fixture = try parseRequestFixture(reqDir, origin: origin)
        let stOnDisk = try Data(contentsOf: respDir.appendingPathComponent("session-transcript.cbor"))
        XCTAssertEqual(fixture.sessionTranscriptBytes, stOnDisk,
                       "request- and response-side SessionTranscripts must agree")

        // 2. Load the recipient HPKE private key from JWK.
        let priv = try Self.loadP256KeyAgreementPrivateKeyFromJWK(
            url: reqDir.appendingPathComponent("recipient-private.jwk.json")
        )

        // 3. Decode the dcapi response wrapper.
        let dcapiBytes = try Data(contentsOf: respDir.appendingPathComponent("dcapi-response.cbor"))
        let (enc, ciphertext) = try DCAPIResponse.decode(dcapiBytes)

        // 4. HPKE-open. info = SessionTranscript bytes; AAD = empty.
        let plaintext = try CheckinHPKE.open(
            ciphertext: ciphertext,
            encapsulatedKey: enc,
            recipientPrivateKey: priv,
            info: fixture.sessionTranscriptBytes,
            aad: Data()
        )

        // 5. Sanity: the decrypted plaintext should match `device-response.cbor`
        //    if the fixture ships it.
        let plaintextOnDisk = respDir.appendingPathComponent("device-response.cbor")
        if FileManager.default.fileExists(atPath: plaintextOnDisk.path) {
            let expectedBytes = try Data(contentsOf: plaintextOnDisk)
            XCTAssertEqual(plaintext, expectedBytes,
                           "HPKE-opened plaintext must equal the canonical device-response.cbor")
        }

        // 6. Parse the DeviceResponse and validate against transcript.
        let response = try DeviceResponseParser.parse(plaintext)
        let validation = try DeviceResponseValidator.validate(
            response,
            sessionTranscript: fixture.sessionTranscriptBytes,
            options: Self.validatorOptions
        )
        XCTAssertTrue(validation.issuerSignatureValid,
                      "issuer signature must verify against embedded x5chain leaf")
        XCTAssertTrue(validation.deviceSignatureValid,
                      "device signature must verify against transcript")
        XCTAssertTrue(validation.digestMatch,
                      "MSO digest must match the IssuerSignedItem tag-24 hash")

        // 7. Extracted SMART JSON semantic-equals smart-response.expected.json.
        let expectedSmart = try Data(contentsOf: respDir.appendingPathComponent("smart-response.expected.json"))
        try assertJSONSemanticallyEqual(validation.smartResponseJSON, expectedSmart)
    }

    // MARK: - C6: pymdoc-minimal Document parse + digest verify

    func testC6_pymdoc_minimal_issuer_only_document() throws {
        let dir = Self.fixture("responses/pymdoc-minimal")
        try requireFixture(dir.appendingPathComponent("document.cbor"))

        let docBytes = try Data(contentsOf: dir.appendingPathComponent("document.cbor"))

        // pyMDOC's `document.cbor` is a DeviceResponse-shaped wrapper with NO
        // `deviceSigned` (issuer-only). Walk the CBOR manually rather than
        // routing through the strict DeviceResponseParser.
        let decodedSliced = try CBORDecoder.lenient.decodeWithSlices(docBytes)
        let decoded = decodedSliced.value
        guard case .map(let top) = decoded,
              case .array(let documents) = top.first(where: {
                  if case .textString("documents") = $0.key { return true } else { return false }
              })?.value ?? .null,
              case .map(let firstDoc) = documents.first ?? .null
        else { return XCTFail("document.cbor not in expected shape") }

        // docType
        let docType: String = {
            if case .textString(let s) = firstDoc.first(where: {
                if case .textString("docType") = $0.key { return true } else { return false }
            })?.value ?? .null { return s } else { return "" }
        }()
        XCTAssertEqual(docType, SmartHealthCheckinConstants.mdocDocType)

        // issuerSigned
        guard case .map(let issuerSigned) = firstDoc.first(where: {
            if case .textString("issuerSigned") = $0.key { return true } else { return false }
        })?.value ?? .null else { return XCTFail("missing issuerSigned") }

        // nameSpaces[ns][0] is Tag(24, bstr CBOR IssuerSignedItem)
        guard case .map(let nameSpaces) = issuerSigned.first(where: {
            if case .textString("nameSpaces") = $0.key { return true } else { return false }
        })?.value ?? .null else { return XCTFail("missing nameSpaces") }

        let nsKey = SmartHealthCheckinConstants.mdocNamespace
        guard case .array(let items) = nameSpaces.first(where: {
            if case .textString(let s) = $0.key, s == nsKey { return true } else { return false }
        })?.value ?? .null,
              let firstItem = items.first
        else { return XCTFail("missing namespace items") }

        // Re-serialize the first item; it's already a Tag(24, bstr) — we want
        // its full encoded bytes for hashing. Use the source slice so the
        // digest is taken over the bytes pyMDOC actually produced (not a
        // re-encoding).
        let firstItemBytes = try decodedSliced.slice(at: [
            .key(.textString("documents")),
            .index(0),
            .key(.textString("issuerSigned")),
            .key(.textString("nameSpaces")),
            .key(.textString(nsKey)),
            .index(0),
        ]).source
        let computedDigest = Data(SHA256.hash(data: firstItemBytes))

        guard case .tagged(24, let inner) = firstItem,
              case .byteString(let isiBytes) = inner
        else { return XCTFail("first item is not Tag(24, bstr)") }
        let isiCBOR = try CBORDecoder.lenient.decode(isiBytes)
        let isi = try IssuerSignedItem.fromCBOR(isiCBOR)
        XCTAssertEqual(isi.elementIdentifier, SmartHealthCheckinConstants.mdocElementIdentifier)
        XCTAssertEqual(isi.digestID, 0)

        // Parse issuerAuth -> COSE_Sign1 -> Tag(24, bstr MSO) -> MSO
        guard case .array(let issuerAuthArr) = issuerSigned.first(where: {
            if case .textString("issuerAuth") = $0.key { return true } else { return false }
        })?.value ?? .null else { return XCTFail("missing issuerAuth") }
        let coseSign1 = try COSESign1.from(.array(issuerAuthArr))
        let payload = try XCTUnwrap(coseSign1.payload)
        let payloadCBOR = try CBORDecoder.lenient.decode(payload)
        guard case .tagged(24, .byteString(let msoBytes)) = payloadCBOR else {
            return XCTFail("issuerAuth payload not Tag(24, bstr)")
        }
        let msoCBOR = try CBORDecoder.lenient.decode(msoBytes)
        let mso = try MobileSecurityObject.fromCBOR(msoCBOR)
        XCTAssertEqual(mso.docType, SmartHealthCheckinConstants.mdocDocType)
        XCTAssertEqual(mso.digestAlgorithm, "SHA-256")

        let digestEntry = try XCTUnwrap(
            mso.valueDigests.first(where: { $0.namespace == nsKey })?.digests.first(where: { $0.id == 0 })
        )
        XCTAssertEqual(digestEntry.digest, computedDigest,
                       "MSO valueDigest must equal SHA-256 of the tag-24 IssuerSignedItem bytes")

        guard case .textString(let smartJSON) = isi.elementValue else {
            return XCTFail("elementValue must be a CBOR text string holding the SMART JSON")
        }
        let extracted = Data(smartJSON.utf8)
        let expected = try Data(contentsOf: dir.appendingPathComponent("smart-response.json"))
        try assertJSONSemanticallyEqual(extracted, expected)
    }

    // MARK: - JWK loader (P-256)

    /// Decode a P-256 KeyAgreement private key from a JWK file with fields
    /// `crv`, `d`, `x`, `y`. We only need `d` (the 32-byte scalar) for
    /// rawRepresentation; `x`/`y` are sanity-checked.
    static func loadP256KeyAgreementPrivateKeyFromJWK(url: URL) throws -> P256.KeyAgreement.PrivateKey {
        let jwk = try loadStrictJSON(url)
        guard case .object(let m) = jwk,
              case .string("P-256") = m.first(where: { $0.key == "crv" })?.value ?? .null,
              case .string(let dB64u) = m.first(where: { $0.key == "d" })?.value ?? .null,
              case .string(let xB64u) = m.first(where: { $0.key == "x" })?.value ?? .null,
              case .string(let yB64u) = m.first(where: { $0.key == "y" })?.value ?? .null
        else {
            throw NSError(domain: "jwk", code: 1, userInfo: [NSLocalizedDescriptionKey: "JWK shape unexpected at \(url.path)"])
        }
        let d = try Base64URL.decode(dB64u)
        let x = try Base64URL.decode(xB64u)
        let y = try Base64URL.decode(yB64u)
        guard d.count == 32, x.count == 32, y.count == 32 else {
            throw NSError(domain: "jwk", code: 2, userInfo: [NSLocalizedDescriptionKey: "JWK coordinate sizes wrong"])
        }
        let priv = try P256.KeyAgreement.PrivateKey(rawRepresentation: d)
        let derivedRaw = priv.publicKey.x963Representation
        let expectedRaw = Data([0x04]) + x + y
        guard derivedRaw == expectedRaw else {
            throw NSError(domain: "jwk", code: 3, userInfo: [NSLocalizedDescriptionKey: "JWK x/y don't match derived public key"])
        }
        return priv
    }
}
