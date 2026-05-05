// SPDX-License-Identifier: MIT
//
// Deterministic CBOR encoder per RFC 8949 §4.2.1 Core Deterministic Encoding.

import Foundation

public enum CBOREncoder {
    public static func encode(_ value: CBOR) -> Data {
        var out = Data()
        write(value, to: &out)
        return out
    }

    public static func encodeMany(_ values: [CBOR]) -> Data {
        var out = Data()
        for v in values { write(v, to: &out) }
        return out
    }

    public static func write(_ value: CBOR, to out: inout Data) {
        switch value {
        case .unsigned(let n):
            writeHead(major: 0, argument: n, to: &out)
        case .negative(let n):
            writeHead(major: 1, argument: n, to: &out)
        case .byteString(let d):
            writeHead(major: 2, argument: UInt64(d.count), to: &out)
            out.append(d)
        case .textString(let s):
            let utf8 = Data(s.utf8)
            writeHead(major: 3, argument: UInt64(utf8.count), to: &out)
            out.append(utf8)
        case .array(let xs):
            writeHead(major: 4, argument: UInt64(xs.count), to: &out)
            for x in xs { write(x, to: &out) }
        case .map(let entries):
            // Deterministic encoding: sort by the bytewise lex order of the
            // encoded keys. Duplicate keys are not permitted.
            var encoded: [(keyBytes: Data, valueBytes: Data)] = []
            encoded.reserveCapacity(entries.count)
            for entry in entries {
                let k = encode(entry.key)
                let v = encode(entry.value)
                encoded.append((k, v))
            }
            encoded.sort { lhs, rhs in
                lexicographicallyLess(lhs.keyBytes, rhs.keyBytes)
            }
            writeHead(major: 5, argument: UInt64(encoded.count), to: &out)
            for pair in encoded {
                out.append(pair.keyBytes)
                out.append(pair.valueBytes)
            }
        case .tagged(let tag, let inner):
            writeHead(major: 6, argument: tag, to: &out)
            write(inner, to: &out)
        case .bool(let b):
            out.append(0xE0 | (b ? 21 : 20))
        case .null:
            out.append(0xF6)
        case .undefined:
            out.append(0xF7)
        }
    }

    @inline(__always)
    public static func writeHead(major: UInt8, argument n: UInt64, to out: inout Data) {
        let mt = major << 5
        if n < 24 {
            out.append(mt | UInt8(n))
        } else if n <= UInt64(UInt8.max) {
            out.append(mt | 24)
            out.append(UInt8(n))
        } else if n <= UInt64(UInt16.max) {
            out.append(mt | 25)
            out.append(UInt8((n >> 8) & 0xFF))
            out.append(UInt8(n & 0xFF))
        } else if n <= UInt64(UInt32.max) {
            out.append(mt | 26)
            out.append(UInt8((n >> 24) & 0xFF))
            out.append(UInt8((n >> 16) & 0xFF))
            out.append(UInt8((n >> 8) & 0xFF))
            out.append(UInt8(n & 0xFF))
        } else {
            out.append(mt | 27)
            for shift: UInt64 in stride(from: 56, through: 0, by: -8) {
                out.append(UInt8((n >> shift) & 0xFF))
            }
        }
    }

    @inline(__always)
    static func lexicographicallyLess(_ a: Data, _ b: Data) -> Bool {
        let n = min(a.count, b.count)
        for i in 0..<n {
            if a[a.startIndex + i] < b[b.startIndex + i] { return true }
            if a[a.startIndex + i] > b[b.startIndex + i] { return false }
        }
        return a.count < b.count
    }
}
