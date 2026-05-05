// SPDX-License-Identifier: MIT
//
// COSE_Key encoding for P-256 EC2 keys (RFC 9052 §7.1, RFC 9053 §7.1.1).
// We only need P-256 for the SMART Health Check-in baseline.
//
// COSE_Key map labels we use:
//   1 (kty):  2 = EC2
//  -1 (crv):  1 = P-256
//  -2 (x):   bstr 32 bytes (left-padded)
//  -3 (y):   bstr 32 bytes (left-padded)
//   3 (alg): -7 = ES256 (optional)
//
// Public-key COSE_Keys carry only x/y. Private keys would also include label
// -4 (d), but this library never serializes private key material into COSE.

import Foundation
import Crypto
import SmartHealthCheckinCBOR

public enum COSEKey {
    /// Encode a P-256 public key as a COSE_Key map suitable for embedding in
    /// `recipientPublicKey` (encryptionInfo) or `deviceKey` (MSO).
    public static func encodeP256(publicKey: P256.KeyAgreement.PublicKey, alg: Int? = nil) -> CBOR {
        return encodeP256(rawX962: publicKey.x963Representation, alg: alg)
    }

    public static func encodeP256(publicKey: P256.Signing.PublicKey, alg: Int? = nil) -> CBOR {
        return encodeP256(rawX962: publicKey.x963Representation, alg: alg)
    }

    /// `rawX962` is the SEC1 uncompressed point: 0x04 || X(32) || Y(32).
    public static func encodeP256(rawX962: Data, alg: Int?) -> CBOR {
        precondition(rawX962.count == 65 && rawX962.first == 0x04,
                     "expected uncompressed P-256 point (65 bytes, 0x04 prefix)")
        let x = rawX962.subdata(in: 1..<33)
        let y = rawX962.subdata(in: 33..<65)
        var entries: [CBORMapEntry] = [
            .init(key: .int(1),  value: .int(2)),     // kty: EC2
            .init(key: .int(-1), value: .int(1)),     // crv: P-256
            .init(key: .int(-2), value: .byteString(x)),
            .init(key: .int(-3), value: .byteString(y)),
        ]
        if let alg = alg {
            entries.append(.init(key: .int(3), value: .int(Int64(alg))))
        }
        return .map(entries)
    }

    /// Decode a COSE_Key map into the SEC1 uncompressed P-256 point bytes
    /// (65 bytes starting with 0x04). Throws if the map is not P-256/EC2 or
    /// if x/y are missing or malformed.
    public static func decodeP256(_ value: CBOR) throws -> P256Public {
        guard case .map(let entries) = value else { throw COSEKeyError.notAMap }
        var members: [Int64: CBOR] = [:]
        for e in entries {
            if case let .unsigned(n) = e.key {
                members[Int64(n)] = e.value
            } else if case let .negative(n) = e.key {
                members[-1 - Int64(n)] = e.value
            } else {
                throw COSEKeyError.unsupportedLabelType
            }
        }
        guard case .unsigned(let kty)? = members[1] ?? nil, kty == 2 else {
            throw COSEKeyError.notEC2
        }
        guard case .unsigned(let crv)? = members[-1] ?? nil, crv == 1 else {
            throw COSEKeyError.unsupportedCurve
        }
        guard case .byteString(let x)? = members[-2] ?? nil else { throw COSEKeyError.missingCoordinate }
        guard case .byteString(let y)? = members[-3] ?? nil else { throw COSEKeyError.missingCoordinate }
        let xPadded = Self.leftPad(x, to: 32)
        let yPadded = Self.leftPad(y, to: 32)
        var raw = Data([0x04])
        raw.append(xPadded)
        raw.append(yPadded)
        let alg: Int64?
        if case .unsigned(let v)? = members[3] ?? nil { alg = Int64(v) }
        else if case .negative(let v)? = members[3] ?? nil { alg = -1 - Int64(v) }
        else { alg = nil }
        return .init(x963: raw, alg: alg)
    }

    public struct P256Public {
        public let x963: Data
        public let alg: Int64?

        public func asKeyAgreementKey() throws -> P256.KeyAgreement.PublicKey {
            try P256.KeyAgreement.PublicKey(x963Representation: x963)
        }
        public func asSigningKey() throws -> P256.Signing.PublicKey {
            try P256.Signing.PublicKey(x963Representation: x963)
        }
    }

    private static func leftPad(_ d: Data, to length: Int) -> Data {
        if d.count == length { return d }
        if d.count > length { return d.suffix(length) }
        var out = Data(repeating: 0, count: length - d.count)
        out.append(d)
        return out
    }
}

public enum COSEKeyError: Error, Equatable, Sendable {
    case notAMap
    case unsupportedLabelType
    case notEC2
    case unsupportedCurve
    case missingCoordinate
}
