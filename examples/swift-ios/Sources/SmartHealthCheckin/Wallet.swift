// SPDX-License-Identifier: MIT
//
// High-level **Wallet** role: parse an incoming DeviceRequest, surface the
// SMART JSON request to the host UI for user consent, then assemble a
// signed+sealed `dcapiResponse` to hand back through the W3C DC API.
//
// The wallet owns:
//   * an issuer keypair (the credential issuer's signing key — typically rooted
//     in the wallet's provisioning flow; for testing the host can mint one)
//   * an mdoc device keypair (one per credential instance)
//   * the user's clinical content the wallet is willing to share
//
// The flow is two-stage so the host UI can show the parsed SMART request,
// gather user consent, and only then build the response.

import Foundation
@preconcurrency import Crypto
import SmartHealthCheckinModel
import SmartHealthCheckinCBOR
import SmartHealthCheckinMdoc

public enum CheckinWalletError: Error, Sendable {
    case malformedDeviceRequest(String)
    case missingSmartRequestCarrier
    case smartRequestInvalid(ValidationReport)
}

public struct ParsedCheckinRequest {
    public let smartRequest: SmartHealthCheckinRequest
    public let smartRequestValidation: ValidationReport
    public let intentToRetain: Bool
    public let docType: String
    public let namespace: String
    public let element: String
    public let readerAuth: COSESign1?
    public let itemsRequestTag24Bytes: Data
}

public struct WalletResponseAssembler {
    public let parsed: ParsedCheckinRequest
    public let encryptionInfoBase64Url: String
    public let origin: String

    /// Build the final base64url-encoded `dcapiResponse` to pass back through
    /// the DC API. The wallet host supplies:
    ///   - the SMART response model the user chose to release
    ///   - the credential's issuer signing key (P-256)
    ///   - the credential's device signing key (P-256)
    ///   - optional issuer certificate chain (DER bytes)
    ///   - optional MSO validity window (defaults to ±1 hour around now)
    public func reply(
        smartResponse: SmartHealthCheckinResponse,
        issuerKey: P256.Signing.PrivateKey,
        deviceKey: P256.Signing.PrivateKey,
        issuerCertificateChain: [Data] = [],
        validityInfo: MobileSecurityObject.ValidityInfo? = nil
    ) throws -> String {
        // Cross-validate the response against the parsed request so the wallet
        // doesn't accidentally ship a malformed reply.
        let crossReport = SmartHealthCheckinValidator.crossValidate(
            request: parsed.smartRequest, response: smartResponse
        )
        if crossReport.hasErrors {
            throw CheckinWalletError.smartRequestInvalid(crossReport)
        }
        let smartJSON = smartResponse.toJSONData()

        // Decode encryptionInfo to get the recipient public key.
        let encInfoBytes = try Base64URL.decode(encryptionInfoBase64Url)
        let envelope = try EncryptionInfo.decode(encInfoBytes)
        let st = SessionTranscript.dcapi(
            encryptionInfoBase64Url: encryptionInfoBase64Url, origin: origin
        )

        // Build the inner DeviceResponse plaintext.
        let opts = DeviceResponseBuilder.Options(
            docType: parsed.docType,
            namespace: parsed.namespace,
            element: parsed.element
        )
        let plaintext = try DeviceResponseBuilder.build(
            smartResponseJSON: smartJSON,
            issuerKey: issuerKey,
            deviceKey: deviceKey,
            sessionTranscript: st,
            options: opts,
            validityInfo: validityInfo,
            issuerCertificateChain: issuerCertificateChain
        )

        // Seal with HPKE and wrap in the dcapi envelope.
        let sealed = try CheckinHPKE.seal(
            plaintext: plaintext, recipientPublicKey: envelope.recipientPublicKey, info: st
        )
        let envBytes = DCAPIResponse.encode(enc: sealed.enc, ciphertext: sealed.ciphertext)
        return Base64URL.encode(envBytes)
    }
}

public enum CheckinWallet {

    /// Parse a DeviceRequest from the W3C DC API call and return both the
    /// host-readable SMART request and an opaque assembler for the reply.
    ///
    /// The caller MUST surface the SMART request to the user for consent
    /// before invoking `assembler.reply(...)`.
    public static func handleRequest(
        deviceRequestBase64Url: String,
        encryptionInfoBase64Url: String,
        origin: String
    ) throws -> (parsed: ParsedCheckinRequest, assembler: WalletResponseAssembler) {
        let dr: Data
        do { dr = try Base64URL.decode(deviceRequestBase64Url) }
        catch { throw CheckinWalletError.malformedDeviceRequest("base64url") }
        let opts = DeviceRequestBuilder.Options(
            docType: SmartHealthCheckinConstants.mdocDocType,
            namespace: SmartHealthCheckinConstants.mdocNamespace,
            element: SmartHealthCheckinConstants.mdocElementIdentifier,
            requestCarrierKey: SmartHealthCheckinConstants.mdocRequestCarrierKey,
            intentToRetain: true
        )
        let parsedReq: CheckinDeviceRequest
        do { parsedReq = try DeviceRequestParser.parse(dr, expecting: opts) }
        catch { throw CheckinWalletError.malformedDeviceRequest(String(describing: error)) }
        guard let docReq = parsedReq.docRequests.first else {
            throw CheckinWalletError.malformedDeviceRequest("no docRequests")
        }
        // Pull the SMART JSON out of the request carrier slot.
        guard let smartJSON = docReq.itemsRequest.smartRequestJSON(
            carrierKey: SmartHealthCheckinConstants.mdocRequestCarrierKey
        ) else {
            throw CheckinWalletError.missingSmartRequestCarrier
        }
        let smartReq: SmartHealthCheckinRequest
        do { smartReq = try SmartHealthCheckinRequest.parse(smartJSON) }
        catch {
            throw CheckinWalletError.malformedDeviceRequest("smart request: \(error)")
        }
        let validationReport = SmartHealthCheckinValidator.validate(request: smartReq)

        // Pull the intentToRetain hint for the SMART element specifically.
        var intent = true
        for ns in docReq.itemsRequest.elementsByNamespace where ns.namespace == SmartHealthCheckinConstants.mdocNamespace {
            for e in ns.elements where e.element == SmartHealthCheckinConstants.mdocElementIdentifier {
                intent = e.intentToRetain
            }
        }
        let parsed = ParsedCheckinRequest(
            smartRequest: smartReq,
            smartRequestValidation: validationReport,
            intentToRetain: intent,
            docType: docReq.itemsRequest.docType,
            namespace: SmartHealthCheckinConstants.mdocNamespace,
            element: SmartHealthCheckinConstants.mdocElementIdentifier,
            readerAuth: docReq.readerAuth,
            itemsRequestTag24Bytes: docReq.itemsRequestTag24Bytes
        )
        let assembler = WalletResponseAssembler(
            parsed: parsed,
            encryptionInfoBase64Url: encryptionInfoBase64Url,
            origin: origin
        )
        return (parsed, assembler)
    }

    /// Validate `readerAuth` if present, against a list of trusted reader
    /// public keys. A value of `nil` means "no readerAuth was supplied" — the
    /// wallet decides whether to proceed based on its policy. Returns `true`
    /// only on a positive verification.
    public static func verifyReaderAuth(
        _ parsed: ParsedCheckinRequest,
        sessionTranscript: Data,
        trustedReaderKeys: [P256.Signing.PublicKey]
    ) -> Bool {
        guard let readerAuth = parsed.readerAuth else { return false }
        let payload = ReaderAuth.readerAuthenticationBytes(
            sessionTranscript: sessionTranscript,
            itemsRequestTag24Bytes: parsed.itemsRequestTag24Bytes
        )
        for k in trustedReaderKeys {
            do {
                try COSESign1Signer.verify(readerAuth, publicKey: k, detachedPayload: payload)
                return true
            } catch { continue }
        }
        return false
    }
}
