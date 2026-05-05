// SPDX-License-Identifier: MIT
//
// Base64url helpers used at the DC API boundary. The W3C DC API uses
// base64url WITHOUT padding for `deviceRequest`, `encryptionInfo`, and the
// returned `dcapiResponse`.

import Foundation

public enum Base64URL {
    /// Encode raw bytes as base64url without padding.
    public static func encode(_ data: Data) -> String {
        var s = data.base64EncodedString()
        s = s.replacingOccurrences(of: "+", with: "-")
        s = s.replacingOccurrences(of: "/", with: "_")
        // strip padding
        while s.hasSuffix("=") { s.removeLast() }
        return s
    }

    /// Decode base64url with or without padding.
    public static func decode(_ string: String) throws -> Data {
        var s = string
        s = s.replacingOccurrences(of: "-", with: "+")
        s = s.replacingOccurrences(of: "_", with: "/")
        // re-pad to a multiple of 4
        let mod = s.count % 4
        if mod == 2 { s += "==" }
        else if mod == 3 { s += "=" }
        else if mod == 1 { throw Base64URLError.invalidLength }
        guard let data = Data(base64Encoded: s) else { throw Base64URLError.invalidContent }
        return data
    }
}

public enum Base64URLError: Error, Equatable, Sendable {
    case invalidLength
    case invalidContent
}
