// SPDX-License-Identifier: MIT

import XCTest
import Crypto
@testable import SmartHealthCheckinMdoc
@testable import SmartHealthCheckinCBOR

final class MdocLayerTests: XCTestCase {

    // MARK: - COSE_Sign1 (ES256, attached + detached)

    func testCOSESign1AttachedAndDetached() throws {
        let key = P256.Signing.PrivateKey()
        let pub = key.publicKey
        let payload = Data("hello attached".utf8)
        let prot = COSESign1Signer.es256ProtectedHeader()

        let attached = try COSESign1Signer.sign(
            payload: payload, attached: true, privateKey: key, protectedBytes: prot
        )
        XCTAssertEqual(attached.payload, payload)
        try COSESign1Signer.verify(attached, publicKey: pub)

        let detached = try COSESign1Signer.sign(
            payload: payload, attached: false, privateKey: key, protectedBytes: prot
        )
        XCTAssertNil(detached.payload)
        try COSESign1Signer.verify(detached, publicKey: pub, detachedPayload: payload)

        // Wrong payload must fail.
        XCTAssertThrowsError(try COSESign1Signer.verify(
            detached, publicKey: pub, detachedPayload: Data("tampered".utf8)
        ))

        // Wrong key must fail.
        let other = P256.Signing.PrivateKey()
        XCTAssertThrowsError(try COSESign1Signer.verify(attached, publicKey: other.publicKey))
    }

    func testCOSEKeyP256RoundTrip() throws {
        let key = P256.Signing.PrivateKey()
        let cose = COSEKey.encodeP256(publicKey: key.publicKey)
        let parsed = try COSEKey.decodeP256(cose)
        let restored = try parsed.asSigningKey()
        XCTAssertEqual(key.publicKey.x963Representation, restored.x963Representation)
    }

    // MARK: - SessionTranscript

    func testSessionTranscriptDeterministic() {
        let s1 = SessionTranscript.dcapi(encryptionInfoBase64Url: "abc", origin: "https://example.org")
        let s2 = SessionTranscript.dcapi(encryptionInfoBase64Url: "abc", origin: "https://example.org")
        XCTAssertEqual(s1, s2)
        let diff = SessionTranscript.dcapi(encryptionInfoBase64Url: "abc", origin: "https://other.example")
        XCTAssertNotEqual(s1, diff)
    }

    // MARK: - HPKE

    func testHPKERoundTrip() throws {
        let pk = P256.KeyAgreement.PrivateKey()
        let info = Data("session-transcript-bytes".utf8)
        let plaintext = Data("the quick brown fox jumps over 13 lazy dogs".utf8)
        let sealed = try CheckinHPKE.seal(
            plaintext: plaintext, recipientPublicKey: pk.publicKey, info: info
        )
        let opened = try CheckinHPKE.open(
            ciphertext: sealed.ciphertext,
            encapsulatedKey: sealed.enc,
            recipientPrivateKey: pk,
            info: info
        )
        XCTAssertEqual(opened, plaintext)
    }

    func testEncryptionInfoRoundTrip() throws {
        let pk = P256.KeyAgreement.PrivateKey()
        let nonce = Data((0..<16).map { _ in UInt8.random(in: 0...255) })
        let bytes = EncryptionInfo.encode(nonce: nonce, recipientPublicKey: pk.publicKey)
        let parsed = try EncryptionInfo.decode(bytes)
        XCTAssertEqual(parsed.nonce, nonce)
        XCTAssertEqual(parsed.recipientPublicKey.x963Representation, pk.publicKey.x963Representation)
    }

    // MARK: - DeviceRequest build & parse

    func testDeviceRequestRoundTrip() throws {
        let smart = """
{"resourceType":"smart-health-checkin-request","id":"r1","modelVersion":"1","items":[]}
""".data(using: .utf8)!
        let opts = DeviceRequestBuilder.Options(
            docType: "org.smarthealthit.checkin.1",
            namespace: "org.smarthealthit.checkin",
            element: "smart_health_checkin_response",
            requestCarrierKey: "org.smarthealthit.checkin.request",
            intentToRetain: true
        )
        let (drBytes, tag24Bytes) = DeviceRequestBuilder.build(smartRequestJSON: smart, options: opts)
        XCTAssertGreaterThan(drBytes.count, 0)
        XCTAssertGreaterThan(tag24Bytes.count, 0)
        let parsed = try DeviceRequestParser.parse(drBytes, expecting: opts)
        XCTAssertEqual(parsed.version, "1.0")
        XCTAssertEqual(parsed.docRequests.count, 1)
        let dr = parsed.docRequests[0]
        XCTAssertEqual(dr.itemsRequest.docType, opts.docType)
        XCTAssertEqual(dr.itemsRequestTag24Bytes, tag24Bytes)

        let outJSON = dr.itemsRequest.smartRequestJSON(carrierKey: opts.requestCarrierKey)
        XCTAssertEqual(outJSON, smart)
    }

    func testReaderAuthDetachedPayloadDeterministic() {
        let st = Data([0x01, 0x02, 0x03, 0x04])
        let ir = Data([0xd8, 0x18, 0x44, 0xaa, 0xbb, 0xcc, 0xdd])
        let p1 = ReaderAuth.readerAuthenticationBytes(sessionTranscript: st, itemsRequestTag24Bytes: ir)
        let p2 = ReaderAuth.readerAuthenticationBytes(sessionTranscript: st, itemsRequestTag24Bytes: ir)
        XCTAssertEqual(p1, p2)
        // Sanity: starts with tag-24 head 0xd8 0x18.
        XCTAssertEqual(p1[0], 0xd8)
        XCTAssertEqual(p1[1], 0x18)
    }

    // MARK: - DeviceResponse build, parse, verify

    func testDeviceResponseBuildAndVerify() throws {
        let issuer = P256.Signing.PrivateKey()
        let device = P256.Signing.PrivateKey()
        let smartJSON = Data("""
{"resourceType":"smart-health-checkin-response","id":"r1","modelVersion":"1","status":[],"artifacts":[]}
""".utf8)
        let st = SessionTranscript.dcapi(encryptionInfoBase64Url: "info-b64u", origin: "https://example.org")
        let opts = DeviceResponseBuilder.Options(
            docType: "org.smarthealthit.checkin.1",
            namespace: "org.smarthealthit.checkin",
            element: "smart_health_checkin_response"
        )
        let bytes = try DeviceResponseBuilder.build(
            smartResponseJSON: smartJSON,
            issuerKey: issuer,
            deviceKey: device,
            sessionTranscript: st,
            options: opts
        )
        let parsed = try DeviceResponseParser.parse(bytes)
        XCTAssertEqual(parsed.version, "1.0")
        XCTAssertEqual(parsed.documents.count, 1)

        let report = try DeviceResponseValidator.validate(
            parsed,
            sessionTranscript: st,
            options: .init(
                docType: opts.docType,
                namespace: opts.namespace,
                element: opts.element,
                trustedIssuerKeys: [issuer.publicKey]
            )
        )
        XCTAssertTrue(report.issuerSignatureValid, "issuer signature should verify")
        XCTAssertTrue(report.deviceSignatureValid, "device signature should verify")
        XCTAssertTrue(report.digestMatch, "value digest should match")
        XCTAssertEqual(report.smartResponseJSON, smartJSON)
    }

    func testDeviceResponseRejectsTamperedSmartJSON() throws {
        let issuer = P256.Signing.PrivateKey()
        let device = P256.Signing.PrivateKey()
        let smartJSON = Data("""
{"resourceType":"smart-health-checkin-response","id":"r1","modelVersion":"1","status":[],"artifacts":[]}
""".utf8)
        let st = SessionTranscript.dcapi(encryptionInfoBase64Url: "info-b64u", origin: "https://example.org")
        let opts = DeviceResponseBuilder.Options(
            docType: "org.smarthealthit.checkin.1",
            namespace: "org.smarthealthit.checkin",
            element: "smart_health_checkin_response"
        )
        var bytes = try DeviceResponseBuilder.build(
            smartResponseJSON: smartJSON,
            issuerKey: issuer,
            deviceKey: device,
            sessionTranscript: st,
            options: opts
        )
        // Locate the SMART JSON byte sequence in the encoded response and
        // flip a byte inside it. This guarantees the change lands inside the
        // digest-covered IssuerSignedItem region (specifically inside the
        // CBOR text string of `elementValue`).
        let needle = Data("checkin-response".utf8)
        guard let r = bytes.range(of: needle) else {
            XCTFail("could not find SMART JSON in encoded response"); return
        }
        bytes[r.lowerBound] ^= 0x01
        let parsed = try DeviceResponseParser.parse(bytes)
        let report = try DeviceResponseValidator.validate(
            parsed, sessionTranscript: st,
            options: .init(
                docType: opts.docType, namespace: opts.namespace,
                element: opts.element, trustedIssuerKeys: [issuer.publicKey]
            )
        )
        XCTAssertFalse(report.digestMatch, "tampered SMART JSON must fail digest check")
        // Issuer and device signatures don't cover the IssuerSignedItem bytes
        // directly (issuer signs the MSO over digests; device signs transcript).
        // So those signals stay valid; only the digest discriminates.
        XCTAssertTrue(report.issuerSignatureValid)
        XCTAssertTrue(report.deviceSignatureValid)
    }

    func testDeviceResponseRejectsWrongTranscript() throws {
        let issuer = P256.Signing.PrivateKey()
        let device = P256.Signing.PrivateKey()
        let smartJSON = Data("{}".utf8)
        let st = SessionTranscript.dcapi(encryptionInfoBase64Url: "info-b64u", origin: "https://a.example")
        let opts = DeviceResponseBuilder.Options(
            docType: "org.smarthealthit.checkin.1",
            namespace: "org.smarthealthit.checkin",
            element: "smart_health_checkin_response"
        )
        let bytes = try DeviceResponseBuilder.build(
            smartResponseJSON: smartJSON, issuerKey: issuer, deviceKey: device,
            sessionTranscript: st, options: opts
        )
        let parsed = try DeviceResponseParser.parse(bytes)
        let wrong = SessionTranscript.dcapi(encryptionInfoBase64Url: "info-b64u", origin: "https://b.example")
        let report = try DeviceResponseValidator.validate(
            parsed, sessionTranscript: wrong,
            options: .init(
                docType: opts.docType, namespace: opts.namespace, element: opts.element,
                trustedIssuerKeys: [issuer.publicKey]
            )
        )
        // Issuer signature is over the MSO (transcript-independent) so it stays
        // valid; the device signature MUST fail because it binds the transcript.
        XCTAssertTrue(report.issuerSignatureValid)
        XCTAssertFalse(report.deviceSignatureValid)
        XCTAssertTrue(report.digestMatch) // digest is independent of transcript
    }

    // MARK: - Base64URL

    func testBase64URLRoundTrip() throws {
        let bytes = Data((0..<37).map { UInt8($0) })
        let s = Base64URL.encode(bytes)
        XCTAssertFalse(s.contains("="))
        XCTAssertFalse(s.contains("+"))
        XCTAssertFalse(s.contains("/"))
        XCTAssertEqual(try Base64URL.decode(s), bytes)
    }
}
