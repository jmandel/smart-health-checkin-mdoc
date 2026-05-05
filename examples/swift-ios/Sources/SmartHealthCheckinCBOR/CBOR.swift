// SPDX-License-Identifier: MIT
//
// Minimal deterministic CBOR codec, scoped to what the SMART Health Check-in
// same-device flow needs. Per spec §8 the wire bytes go through three
// signature/digest boundaries (issuer signature, device signature, mdoc value
// digest), so encoding has to be both deterministic AND able to round-trip
// preserving the exact bytes received.
//
// Design:
//
//  * `CBOR` is a recursive value type covering the major-type set we actually
//    use: unsigned integer, negative integer, byte string, text string, array,
//    map (ordered, allows non-text keys), tagged value, bool, null, undefined.
//
//  * Floats and indefinite-length encodings are intentionally NOT supported.
//    The protocol does not need them and they are an easy source of
//    non-deterministic bytes.
//
//  * `CBOREncoder.encode(_)` emits RFC 8949 Core Deterministic Encoding —
//    shortest length encoding for ints/lengths, and map keys sorted by the
//    bytewise lexicographic order of their encoded keys. (For the integer-
//    keyed COSE_Key maps used here this matches ISO 18013-5 length-then-lex
//    ordering, since all keys are single-byte head encodings.)
//
//  * `CBORDecoder.decode(_)` parses a single top-level item and either returns
//    just a `CBOR` value or, via `decodeWithSlices`, a `(value, source-byte-
//    range)` pair plus a side-table mapping every decoded sub-item to its
//    exact source byte range. That side-table is what lets the verifier hash
//    the exact `Tag(24, bstr .cbor IssuerSignedItem)` bytes the wallet sent
//    (the digest is taken over the outer wrapper bytes, not a re-encoding).

import Foundation

public indirect enum CBOR: Sendable, Equatable, Hashable {
    case unsigned(UInt64)         // major 0
    case negative(UInt64)         // major 1, encodes value = -1 - n
    case byteString(Data)         // major 2
    case textString(String)       // major 3
    case array([CBOR])            // major 4
    case map([CBORMapEntry])      // major 5; ordered for determinism control
    case tagged(UInt64, CBOR)     // major 6
    case bool(Bool)               // major 7, simple values 20/21
    case null                     // major 7, simple value 22
    case undefined                // major 7, simple value 23

    /// Build a CBOR signed integer that picks the right major (0 or 1) based on sign.
    public static func int(_ value: Int64) -> CBOR {
        if value >= 0 { return .unsigned(UInt64(value)) }
        // -1 - value. For Int64.min, UInt64(-(value+1)) == UInt64(Int64.max), correct.
        let n = UInt64(-(value + 1))
        return .negative(n)
    }

    /// Convenience: build a Tag(24, bstr .cbor inner) wrapper from a CBOR value.
    /// Encodes `inner` deterministically and stores the bytes in the byte
    /// string of the Tag(24).
    public static func tag24(_ inner: CBOR) -> CBOR {
        let bytes = CBOREncoder.encode(inner)
        return .tagged(24, .byteString(bytes))
    }

    /// Build Tag(24, bstr) where the bstr contains pre-existing CBOR bytes
    /// (e.g. an `IssuerSignedItem` tag-24 wrapper that we received and are
    /// passing through unmodified).
    public static func tag24Bytes(_ alreadyEncoded: Data) -> CBOR {
        return .tagged(24, .byteString(alreadyEncoded))
    }

    /// If this CBOR value is a `Tag(24, bstr <inner>)`, return `<inner>`.
    public var tag24InnerBytes: Data? {
        if case let .tagged(24, .byteString(d)) = self { return d }
        return nil
    }
}

public struct CBORMapEntry: Sendable, Equatable, Hashable {
    public let key: CBOR
    public let value: CBOR
    public init(key: CBOR, value: CBOR) { self.key = key; self.value = value }
}

public enum CBORError: Error, Equatable, Sendable {
    case unexpectedEnd
    case unsupportedFloatType(at: Int)
    case unsupportedIndefiniteLength(at: Int)
    case unsupportedSimpleValue(value: UInt8, at: Int)
    case nonCanonicalLengthEncoding(at: Int)
    case stringNotUTF8(at: Int)
    case nestingTooDeep(at: Int)
    case duplicateMapKey(at: Int)
    case unsortedMapKeys(at: Int)
    case trailingData(at: Int)
    case invalidIntegerArgument(at: Int)
}
