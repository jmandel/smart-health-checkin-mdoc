// SPDX-License-Identifier: MIT
//
// SessionTranscript construction for the W3C DC API direct `dcapi` handover
// (SMART Health Check-in 1.0 §8.3).
//
//   dcapiInfo         = CBOR([encryptionInfoBase64Url, origin])
//   handover          = ["dcapi", SHA-256(dcapiInfo)]
//   SessionTranscript = CBOR([null, null, handover])
//
// The two leading `null`s are reserved for legacy DeviceEngagement /
// EReaderHandover (NFC, BLE) and are not used by DC API.

import Foundation
import Crypto
import SmartHealthCheckinCBOR

public enum SessionTranscript {
    /// Build the SessionTranscript bytes for the `dcapi` handover.
    ///
    /// - Parameter encryptionInfoBase64Url: the EXACT unpadded base64url string
    ///   the verifier sent in `data.encryptionInfo`. Both sides MUST use this
    ///   same string when computing the transcript — re-encoding it (changing
    ///   case, padding, whitespace, or normalization) breaks the binding.
    /// - Parameter origin: the authenticated origin or approved equivalent
    ///   supplied by the browser / Credential Manager. The wallet MUST obtain
    ///   this from authenticated platform sources, not from the SMART JSON
    ///   request body.
    public static func dcapi(encryptionInfoBase64Url: String, origin: String) -> Data {
        let dcapiInfo = CBOR.array([
            .textString(encryptionInfoBase64Url),
            .textString(origin),
        ])
        let dcapiInfoBytes = CBOREncoder.encode(dcapiInfo)
        let handoverHash = SHA256.hash(data: dcapiInfoBytes)
        let handover = CBOR.array([
            .textString("dcapi"),
            .byteString(Data(handoverHash)),
        ])
        let transcript = CBOR.array([
            .null,
            .null,
            handover,
        ])
        return CBOREncoder.encode(transcript)
    }
}
