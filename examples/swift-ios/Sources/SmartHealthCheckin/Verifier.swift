// SPDX-License-Identifier: MIT
//
// High-level **Verifier** role: build a `DeviceRequest` to send through the
// W3C Digital Credentials API, and open / validate the wallet's response.
//
// The verifier owns:
//   * the SMART check-in JSON request body (clinical model, §5)
//   * an ephemeral HPKE recipient key pair (P-256, KeyAgreement)
//   * an `encryptionInfo` byte string sent to the wallet alongside `deviceRequest`
//   * the authenticated `origin` of the page making the request (browser-supplied)
//
// The retained state is what the verifier must hold while the request is in
// flight. Treat it as ephemeral session state: a fresh state per request.

import Foundation
@preconcurrency import Crypto
import SmartHealthCheckinModel
import SmartHealthCheckinCBOR
import SmartHealthCheckinMdoc

/// State the verifier must retain between issuing a request and opening the
/// response. **Hold privately** — it contains the ephemeral HPKE private key.
public struct VerifierRetainedState {
    public let privateKey: P256.KeyAgreement.PrivateKey
    /// EXACT base64url string sent to the wallet. MUST be reused verbatim when
    /// computing SessionTranscript at response-open time.
    public let encryptionInfoBase64Url: String
    /// EXACT base64url string of the deviceRequest sent. Useful for audit.
    public let deviceRequestBase64Url: String
    /// Original SMART request, retained for §6.4 cross-validation.
    public let smartRequest: SmartHealthCheckinRequest
    /// Optional reader signing key (when `readerAuth` is used).
    public let readerSigningKey: P256.Signing.PrivateKey?

    public init(
        privateKey: P256.KeyAgreement.PrivateKey,
        encryptionInfoBase64Url: String,
        deviceRequestBase64Url: String,
        smartRequest: SmartHealthCheckinRequest,
        readerSigningKey: P256.Signing.PrivateKey? = nil
    ) {
        self.privateKey = privateKey
        self.encryptionInfoBase64Url = encryptionInfoBase64Url
        self.deviceRequestBase64Url = deviceRequestBase64Url
        self.smartRequest = smartRequest
        self.readerSigningKey = readerSigningKey
    }
}

/// Result of a successful Verifier-side response opening. Each cryptographic
/// signal is reported separately so the host application can apply policy
/// (e.g. accept response with valid issuer signature but warn on unknown
/// trust anchor; reject if device signature fails).
public struct VerifierResponseResult {
    public let smartResponse: SmartHealthCheckinResponse
    public let smartResponseJSON: Data
    public let crossValidation: ValidationReport
    public let issuerSignatureValid: Bool
    public let deviceSignatureValid: Bool
    public let valueDigestMatches: Bool
    public let validityInfo: MobileSecurityObject.ValidityInfo
    public let issuerCertificateChain: [Data]
    public let docType: String

    /// Convenience: `true` only if every cryptographic boundary checks out
    /// AND the SMART model cross-validation produced no errors. Most apps
    /// should examine the individual fields rather than this aggregate.
    public var allChecksPass: Bool {
        return issuerSignatureValid && deviceSignatureValid && valueDigestMatches
            && !crossValidation.hasErrors
    }
}

public enum CheckinVerifierError: Error, Sendable {
    case requestValidationFailed(ValidationReport)
    case dcapiResponseMalformed
    case hpkeOpenFailed
    case responseModelMalformed(String)
    case noDocumentsInResponse
}

public enum CheckinVerifier {

    /// Build a fresh DeviceRequest + EncryptionInfo pair.
    ///
    /// - Parameters:
    ///   - smartRequest: the SMART Health Check-in request the wallet should fulfill.
    ///   - readerSigningKey: when supplied, the request will carry a `readerAuth`
    ///     COSE_Sign1 signed by this key. The wallet MUST be able to verify
    ///     this against a trust anchor it knows.
    ///   - readerCertificateChain: optional x5chain (label 33) for `readerAuth`.
    ///   - origin: required when `readerSigningKey != nil`, since reader-auth
    ///     signs over the SessionTranscript (which depends on `origin`).
    public static func makeRequest(
        smartRequest: SmartHealthCheckinRequest,
        intentToRetain: Bool = true,
        readerSigningKey: P256.Signing.PrivateKey? = nil,
        readerCertificateChain: [Data] = [],
        origin: String? = nil
    ) throws -> (deviceRequestBase64Url: String,
                 encryptionInfoBase64Url: String,
                 retainedState: VerifierRetainedState) {

        // 1. Validate the SMART request body up front so we don't ship an
        //    invalid request and get a useless response.
        let report = SmartHealthCheckinValidator.validate(request: smartRequest)
        if report.hasErrors { throw CheckinVerifierError.requestValidationFailed(report) }
        let smartJSON = smartRequest.toJSONData()

        // 2. Mint the ephemeral HPKE recipient key + nonce, then build encryptionInfo.
        //    Spec §8.2: nonce bytes SHOULD have at least 16 bytes of entropy.
        //    We use 32 to mirror the reference demo's posture.
        let priv = P256.KeyAgreement.PrivateKey()
        let nonce = randomBytes(32)
        let encInfoBytes = EncryptionInfo.encode(nonce: nonce, recipientPublicKey: priv.publicKey)
        let encInfoB64u = Base64URL.encode(encInfoBytes)

        // 3. Build the inner DeviceRequest. If readerAuth is requested, build
        //    the SessionTranscript first and produce a detached COSE_Sign1.
        let opts = DeviceRequestBuilder.Options(
            docType: SmartHealthCheckinConstants.mdocDocType,
            namespace: SmartHealthCheckinConstants.mdocNamespace,
            element: SmartHealthCheckinConstants.mdocElementIdentifier,
            requestCarrierKey: SmartHealthCheckinConstants.mdocRequestCarrierKey,
            intentToRetain: intentToRetain
        )
        var readerAuth: COSESign1?
        if let readerKey = readerSigningKey {
            guard let origin = origin else {
                throw CheckinVerifierError.requestValidationFailed(
                    ValidationReport(issues: [
                        ValidationIssue(severity: .error, path: "readerAuth",
                                        message: "origin is required when signing readerAuth")
                    ])
                )
            }
            // First build the items request bytes without readerAuth so we can sign over them.
            let (_, itemsRequestTag24Bytes) = DeviceRequestBuilder.build(
                smartRequestJSON: smartJSON, options: opts, readerAuth: nil
            )
            let st = SessionTranscript.dcapi(encryptionInfoBase64Url: encInfoB64u, origin: origin)
            let payload = ReaderAuth.readerAuthenticationBytes(
                sessionTranscript: st, itemsRequestTag24Bytes: itemsRequestTag24Bytes
            )
            var unprotected: [CBORMapEntry] = []
            if !readerCertificateChain.isEmpty {
                unprotected.append(.init(
                    key: .int(33),
                    value: readerCertificateChain.count == 1
                        ? .byteString(readerCertificateChain[0])
                        : .array(readerCertificateChain.map { .byteString($0) })
                ))
            }
            readerAuth = try COSESign1Signer.sign(
                payload: payload, attached: false, privateKey: readerKey,
                protectedBytes: COSESign1Signer.es256ProtectedHeader(),
                unprotected: unprotected
            )
        }
        let (deviceRequestBytes, _) = DeviceRequestBuilder.build(
            smartRequestJSON: smartJSON, options: opts, readerAuth: readerAuth
        )
        let deviceRequestB64u = Base64URL.encode(deviceRequestBytes)

        let state = VerifierRetainedState(
            privateKey: priv,
            encryptionInfoBase64Url: encInfoB64u,
            deviceRequestBase64Url: deviceRequestB64u,
            smartRequest: smartRequest,
            readerSigningKey: readerSigningKey
        )
        return (deviceRequestB64u, encInfoB64u, state)
    }

    /// Open and verify a `dcapiResponse` from the wallet.
    ///
    /// Returns a structured result with separate trust signals. Callers should
    /// apply policy on these signals — do not assume `.allChecksPass` matches
    /// their threat model.
    public static func openResponse(
        retainedState: VerifierRetainedState,
        origin: String,
        dcapiResponseBase64Url: String,
        trustedIssuerKeys: [P256.Signing.PublicKey]? = nil
    ) throws -> VerifierResponseResult {
        let respBytes = try Base64URL.decode(dcapiResponseBase64Url)
        let env: (enc: Data, ciphertext: Data)
        do { env = try DCAPIResponse.decode(respBytes) }
        catch { throw CheckinVerifierError.dcapiResponseMalformed }

        let st = SessionTranscript.dcapi(
            encryptionInfoBase64Url: retainedState.encryptionInfoBase64Url, origin: origin
        )
        let plaintext: Data
        do {
            plaintext = try CheckinHPKE.open(
                ciphertext: env.ciphertext,
                encapsulatedKey: env.enc,
                recipientPrivateKey: retainedState.privateKey,
                info: st
            )
        } catch {
            throw CheckinVerifierError.hpkeOpenFailed
        }

        let parsed = try DeviceResponseParser.parse(plaintext)
        let validation = try DeviceResponseValidator.validate(
            parsed,
            sessionTranscript: st,
            options: .init(
                docType: SmartHealthCheckinConstants.mdocDocType,
                namespace: SmartHealthCheckinConstants.mdocNamespace,
                element: SmartHealthCheckinConstants.mdocElementIdentifier,
                trustedIssuerKeys: trustedIssuerKeys
            )
        )

        // Parse SMART JSON and run §6.4 cross-validation.
        let smartResp: SmartHealthCheckinResponse
        do {
            smartResp = try SmartHealthCheckinResponse.parse(validation.smartResponseJSON)
        } catch {
            throw CheckinVerifierError.responseModelMalformed(String(describing: error))
        }
        let crossReport = SmartHealthCheckinValidator.crossValidate(
            request: retainedState.smartRequest, response: smartResp
        )

        return VerifierResponseResult(
            smartResponse: smartResp,
            smartResponseJSON: validation.smartResponseJSON,
            crossValidation: crossReport,
            issuerSignatureValid: validation.issuerSignatureValid,
            deviceSignatureValid: validation.deviceSignatureValid,
            valueDigestMatches: validation.digestMatch,
            validityInfo: validation.validityInfo,
            issuerCertificateChain: validation.issuerCertificateChain,
            docType: validation.docType
        )
    }

    static func randomBytes(_ count: Int) -> Data {
        var d = Data(count: count)
        d.withUnsafeMutableBytes { ptr in
            guard let base = ptr.baseAddress else { return }
            for i in 0..<count { base.advanced(by: i).storeBytes(of: UInt8.random(in: 0...255), as: UInt8.self) }
        }
        return d
    }
}
