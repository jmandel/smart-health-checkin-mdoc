// SPDX-License-Identifier: MIT

import XCTest
import Crypto
@testable import SmartHealthCheckin
@testable import SmartHealthCheckinModel
@testable import SmartHealthCheckinMdoc
@testable import SmartHealthCheckinCBOR

final class VerifierWalletRoundTripTests: XCTestCase {

    static let origin = "https://verifier.example"

    /// Build a minimal but conformant request: one item asking for a SHC with
    /// an ImmunizationHistory-style profile. The wallet returns a SHC artifact.
    func makeRequest() -> SmartHealthCheckinRequest {
        let item = SmartHealthCheckinRequest.Item(
            id: "imm",
            title: "Immunization history",
            content: .selectionFhir(.init(
                profiles: ["http://hl7.org/fhir/StructureDefinition/Immunization"],
                profilesFrom: nil,
                resourceTypes: nil
            )),
            accept: [
                SmartHealthCheckinConstants.mediaTypeSmartHealthCard,
                SmartHealthCheckinConstants.mediaTypeFhirJson,
            ]
        )
        return SmartHealthCheckinRequest(id: "req-1", items: [item])
    }

    func makeResponse(forRequest req: SmartHealthCheckinRequest) -> SmartHealthCheckinResponse {
        // Single SHC artifact fulfilling 'imm'.
        let shc = Artifact.SmartHealthCard(
            id: "shc-1",
            fulfills: ["imm"],
            verifiableCredentials: ["eyJraWQiOiJ0ZXN0In0..."]
        )
        let status = RequestItemStatus(item: "imm", status: .fulfilled)
        return SmartHealthCheckinResponse(
            requestId: req.id, artifacts: [.smartHealthCard(shc)], requestStatus: [status]
        )
    }

    // MARK: - Happy path round trip

    func testFullRoundTripSucceeds() throws {
        let req = makeRequest()
        let made = try CheckinVerifier.makeRequest(smartRequest: req)
        XCTAssertFalse(made.deviceRequestBase64Url.isEmpty)
        XCTAssertFalse(made.encryptionInfoBase64Url.isEmpty)

        // Wallet side
        let parsed = try CheckinWallet.handleRequest(
            deviceRequestBase64Url: made.deviceRequestBase64Url,
            encryptionInfoBase64Url: made.encryptionInfoBase64Url,
            origin: Self.origin
        )
        XCTAssertEqual(parsed.parsed.smartRequest, req,
                       "the parsed SMART request must equal the original")
        XCTAssertFalse(parsed.parsed.smartRequestValidation.hasErrors,
                       "round-tripped request must validate cleanly")

        let resp = makeResponse(forRequest: parsed.parsed.smartRequest)
        let issuer = P256.Signing.PrivateKey()
        let device = P256.Signing.PrivateKey()

        let dcResp = try parsed.assembler.reply(
            smartResponse: resp, issuerKey: issuer, deviceKey: device
        )
        XCTAssertFalse(dcResp.isEmpty)

        // Verifier side
        let opened = try CheckinVerifier.openResponse(
            retainedState: made.retainedState,
            origin: Self.origin,
            dcapiResponseBase64Url: dcResp,
            trustedIssuerKeys: [issuer.publicKey]
        )
        XCTAssertTrue(opened.issuerSignatureValid, "issuer signature should verify")
        XCTAssertTrue(opened.deviceSignatureValid, "device signature should verify")
        XCTAssertTrue(opened.valueDigestMatches, "value digest should match")
        XCTAssertEqual(opened.smartResponse.requestId, req.id)
        XCTAssertEqual(opened.smartResponse.artifacts.count, 1)
        XCTAssertFalse(opened.crossValidation.hasErrors,
                       "§6.4 cross-validation should succeed: \(opened.crossValidation)")
        XCTAssertTrue(opened.allChecksPass)
    }

    // MARK: - Origin tampering breaks deviceSignature

    func testWrongOriginAtVerifierFailsDeviceSignature() throws {
        let req = makeRequest()
        let made = try CheckinVerifier.makeRequest(smartRequest: req)

        let parsed = try CheckinWallet.handleRequest(
            deviceRequestBase64Url: made.deviceRequestBase64Url,
            encryptionInfoBase64Url: made.encryptionInfoBase64Url,
            origin: Self.origin
        )
        let resp = makeResponse(forRequest: parsed.parsed.smartRequest)
        let issuer = P256.Signing.PrivateKey()
        let device = P256.Signing.PrivateKey()
        let dcResp = try parsed.assembler.reply(
            smartResponse: resp, issuerKey: issuer, deviceKey: device
        )
        // Verifier opens with the WRONG origin → HPKE info mismatch → open fails.
        XCTAssertThrowsError(try CheckinVerifier.openResponse(
            retainedState: made.retainedState,
            origin: "https://attacker.example",
            dcapiResponseBase64Url: dcResp,
            trustedIssuerKeys: [issuer.publicKey]
        ))
    }

    // MARK: - readerAuth round trip

    func testReaderAuthSignedAndVerified() throws {
        let req = makeRequest()
        let readerKey = P256.Signing.PrivateKey()
        let made = try CheckinVerifier.makeRequest(
            smartRequest: req,
            readerSigningKey: readerKey,
            origin: Self.origin
        )
        let parsed = try CheckinWallet.handleRequest(
            deviceRequestBase64Url: made.deviceRequestBase64Url,
            encryptionInfoBase64Url: made.encryptionInfoBase64Url,
            origin: Self.origin
        )
        XCTAssertNotNil(parsed.parsed.readerAuth)

        // Wallet verifies readerAuth against the trusted reader key.
        let st = SessionTranscript.dcapi(
            encryptionInfoBase64Url: made.encryptionInfoBase64Url, origin: Self.origin
        )
        XCTAssertTrue(CheckinWallet.verifyReaderAuth(
            parsed.parsed, sessionTranscript: st, trustedReaderKeys: [readerKey.publicKey]
        ))

        // Untrusted reader key fails.
        let other = P256.Signing.PrivateKey()
        XCTAssertFalse(CheckinWallet.verifyReaderAuth(
            parsed.parsed, sessionTranscript: st, trustedReaderKeys: [other.publicKey]
        ))
    }

    // MARK: - Cross-validation surfaces mismatches

    func testCrossValidationCatchesMediaTypeOutsideAccept() throws {
        let req = SmartHealthCheckinRequest(id: "req-2", items: [
            .init(id: "imm", title: "Immunization", content: .selectionFhir(.init(
                profiles: nil, profilesFrom: nil, resourceTypes: ["Immunization"])
            ), accept: [SmartHealthCheckinConstants.mediaTypeSmartHealthCard])
        ])
        // Wallet returns FHIR JSON even though accept[] only allows SHC.
        let badResp = SmartHealthCheckinResponse(
            requestId: "req-2",
            artifacts: [.fhirJson(.init(
                id: "imm-1", fulfills: ["imm"], fhirVersion: "4.0.1",
                value: .object([("resourceType", .string("Immunization"))])
            ))],
            requestStatus: [.init(item: "imm", status: .fulfilled)]
        )
        let report = SmartHealthCheckinValidator.crossValidate(request: req, response: badResp)
        XCTAssertTrue(report.hasErrors)
        XCTAssertTrue(report.errors.contains { $0.message.contains("not in accept[]") })
    }
}
