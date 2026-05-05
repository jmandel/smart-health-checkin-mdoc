// SPDX-License-Identifier: MIT
//
// CBOR decoder. Strict on the subset of RFC 8949 we use:
//
//  * Definite-length only.
//  * No floats.
//  * Simple values: only true / false / null / undefined.
//  * Integer/length arguments must use the SHORTEST encoding (deterministic
//    decode), so a malicious or non-conformant peer that uses a longer-than-
//    needed encoding is rejected — that protects digest agreement.
//  * Map keys must be unique and (optionally, when `enforceCanonicalMaps` is
//    true) appear sorted in the bytewise lex order of their encodings.
//
// `decodeWithSlices` records the source byte range of every parsed item in a
// per-item byte-range table, so callers can extract the *exact* bytes for
// embedded items (Tag(24, bstr ...) wrappers, COSE protected headers, etc.).

import Foundation

public struct CBORDecoder {
    /// When true, decoding rejects maps whose keys are not in deterministic
    /// canonical order. The same-device protocol expects deterministic input,
    /// but if you need to interop with a producer that hasn't yet caught up,
    /// flip this off and rely on duplicate-key detection alone.
    public var enforceCanonicalMaps: Bool
    public var maxDepth: Int

    public init(enforceCanonicalMaps: Bool = true, maxDepth: Int = 256) {
        self.enforceCanonicalMaps = enforceCanonicalMaps
        self.maxDepth = maxDepth
    }

    public static let strict = CBORDecoder()
    public static let lenient = CBORDecoder(enforceCanonicalMaps: false)

    public func decode(_ data: Data) throws -> CBOR {
        var r = Reader(bytes: Array(data))
        let v = try parseItem(&r, depth: 0)
        if r.cursor != r.bytes.count {
            throw CBORError.trailingData(at: r.cursor)
        }
        return v
    }

    /// Decode and also return the per-item source byte ranges. Useful when
    /// you need the exact bytes of an embedded element (e.g. an
    /// IssuerSignedItem tag-24 wrapper) so you can hash or verify against
    /// what was actually received.
    public func decodeWithSlices(_ data: Data) throws -> DecodedCBOR {
        var r = Reader(bytes: Array(data))
        var ranges: [Range<Int>] = []
        let v = try parseItem(&r, depth: 0, recordingTo: &ranges)
        if r.cursor != r.bytes.count {
            throw CBORError.trailingData(at: r.cursor)
        }
        return DecodedCBOR(value: v, source: data, topLevelRange: ranges.last ?? 0..<data.count, slices: ranges)
    }

    // MARK: - Slices wrapper

    public struct DecodedCBOR {
        public let value: CBOR
        public let source: Data
        public let topLevelRange: Range<Int>
        /// Flat list of every parsed item's source byte range, in document order
        /// (post-order: an item's range is appended after all its children).
        public let slices: [Range<Int>]

        /// Walk to a sub-item at the given path and return both the sub-CBOR and
        /// its exact source byte slice. Path supports `.index(Int)` for arrays
        /// and `.key(CBOR)` for maps. If the path passes through a `Tag(24, bstr)`
        /// node, the byte string contents are recursively re-decoded with the
        /// same byte-range tracking applied to the inner CBOR document.
        public func slice(at path: [PathStep]) throws -> SubSlice {
            return try CBORDecoder.lenient.subSlice(
                of: value, source: source, range: topLevelRange,
                steps: path, slicesIndex: 0)
        }

        public enum PathStep: Equatable {
            case index(Int)
            case key(CBOR)
            /// Drill into a Tag(24, bstr) wrapper's inner CBOR.
            case tag24Inner
        }

        public struct SubSlice {
            public let value: CBOR
            public let source: Data
        }
    }

    func subSlice(of value: CBOR, source: Data, range: Range<Int>, steps: [DecodedCBOR.PathStep], slicesIndex _: Int) throws -> DecodedCBOR.SubSlice {
        var current: CBOR = value
        var currentSource = source
        var currentRange = range
        for step in steps {
            switch step {
            case .index(let i):
                guard case .array(let xs) = current, xs.indices.contains(i) else {
                    throw CBORError.invalidIntegerArgument(at: 0)
                }
                let slices = try collectChildSlices(currentSource[currentRange])
                current = xs[i]
                currentRange = slices[i].advanced(by: currentRange.lowerBound)
            case .key(let k):
                guard case .map(let entries) = current else {
                    throw CBORError.invalidIntegerArgument(at: 0)
                }
                let slices = try collectMapValueSlices(currentSource[currentRange])
                guard let idx = entries.firstIndex(where: { $0.key == k }) else {
                    throw CBORError.invalidIntegerArgument(at: 0)
                }
                current = entries[idx].value
                currentRange = slices[idx].advanced(by: currentRange.lowerBound)
            case .tag24Inner:
                guard case let .tagged(24, .byteString(inner)) = current else {
                    throw CBORError.invalidIntegerArgument(at: 0)
                }
                let decoded = try CBORDecoder.lenient.decodeWithSlices(inner)
                return .init(value: decoded.value, source: inner)
            }
        }
        return .init(value: current, source: currentSource.subdata(in: currentRange))
    }

    /// For an array's encoded source, return the byte ranges (relative to the
    /// start of the array's source) of each child item.
    private func collectChildSlices(_ src: Data) throws -> [Range<Int>] {
        var r = Reader(bytes: Array(src))
        let head = try r.readHead()
        guard head.major == 4 else { return [] }
        let count = Int(head.argument)
        var ranges: [Range<Int>] = []
        for _ in 0..<count {
            let start = r.cursor
            _ = try parseItem(&r, depth: 0)
            ranges.append(start..<r.cursor)
        }
        return ranges
    }

    /// For a map's encoded source, return the byte ranges (relative to the
    /// start of the map's source) of each *value* child item, in declaration
    /// order. The key is decoded but its range is not retained here.
    private func collectMapValueSlices(_ src: Data) throws -> [Range<Int>] {
        var r = Reader(bytes: Array(src))
        let head = try r.readHead()
        guard head.major == 5 else { return [] }
        let count = Int(head.argument)
        var ranges: [Range<Int>] = []
        for _ in 0..<count {
            _ = try parseItem(&r, depth: 0) // key
            let start = r.cursor
            _ = try parseItem(&r, depth: 0) // value
            ranges.append(start..<r.cursor)
        }
        return ranges
    }

    // MARK: - Reader and parser

    struct Reader {
        let bytes: [UInt8]
        var cursor: Int = 0

        mutating func readHead() throws -> Head {
            guard cursor < bytes.count else { throw CBORError.unexpectedEnd }
            let initial = bytes[cursor]; cursor += 1
            let major = initial >> 5
            let info = initial & 0x1F
            let argument: UInt64
            switch info {
            case 0...23:
                argument = UInt64(info)
            case 24:
                guard cursor + 1 <= bytes.count else { throw CBORError.unexpectedEnd }
                let v = bytes[cursor]; cursor += 1
                argument = UInt64(v)
                if v < 24 { throw CBORError.nonCanonicalLengthEncoding(at: cursor - 1) }
            case 25:
                guard cursor + 2 <= bytes.count else { throw CBORError.unexpectedEnd }
                let hi = UInt64(bytes[cursor]); let lo = UInt64(bytes[cursor + 1]); cursor += 2
                argument = (hi << 8) | lo
                if argument <= UInt64(UInt8.max) { throw CBORError.nonCanonicalLengthEncoding(at: cursor - 2) }
            case 26:
                guard cursor + 4 <= bytes.count else { throw CBORError.unexpectedEnd }
                var v: UInt64 = 0
                for i in 0..<4 { v = (v << 8) | UInt64(bytes[cursor + i]) }
                cursor += 4
                argument = v
                if argument <= UInt64(UInt16.max) { throw CBORError.nonCanonicalLengthEncoding(at: cursor - 4) }
            case 27:
                guard cursor + 8 <= bytes.count else { throw CBORError.unexpectedEnd }
                var v: UInt64 = 0
                for i in 0..<8 { v = (v << 8) | UInt64(bytes[cursor + i]) }
                cursor += 8
                argument = v
                if argument <= UInt64(UInt32.max) { throw CBORError.nonCanonicalLengthEncoding(at: cursor - 8) }
            case 31:
                throw CBORError.unsupportedIndefiniteLength(at: cursor - 1)
            default:
                throw CBORError.unsupportedSimpleValue(value: info, at: cursor - 1)
            }
            return Head(major: major, info: info, argument: argument)
        }
    }

    struct Head {
        let major: UInt8
        let info: UInt8
        let argument: UInt64
    }

    private func parseItem(_ r: inout Reader, depth: Int) throws -> CBOR {
        var sink: [Range<Int>] = []
        return try parseItem(&r, depth: depth, recordingTo: &sink)
    }

    private func parseItem(_ r: inout Reader, depth: Int, recordingTo ranges: inout [Range<Int>]) throws -> CBOR {
        if depth > maxDepth { throw CBORError.nestingTooDeep(at: r.cursor) }
        let start = r.cursor
        let head = try r.readHead()
        let value: CBOR
        switch head.major {
        case 0:
            value = .unsigned(head.argument)
        case 1:
            value = .negative(head.argument)
        case 2:
            let n = Int(head.argument)
            guard r.cursor + n <= r.bytes.count else { throw CBORError.unexpectedEnd }
            let d = Data(r.bytes[r.cursor..<(r.cursor + n)])
            r.cursor += n
            value = .byteString(d)
        case 3:
            let n = Int(head.argument)
            guard r.cursor + n <= r.bytes.count else { throw CBORError.unexpectedEnd }
            let d = Data(r.bytes[r.cursor..<(r.cursor + n)])
            r.cursor += n
            guard let s = String(data: d, encoding: .utf8) else {
                throw CBORError.stringNotUTF8(at: start)
            }
            value = .textString(s)
        case 4:
            let n = Int(head.argument)
            var items: [CBOR] = []
            items.reserveCapacity(n)
            for _ in 0..<n {
                items.append(try parseItem(&r, depth: depth + 1, recordingTo: &ranges))
            }
            value = .array(items)
        case 5:
            let n = Int(head.argument)
            var entries: [CBORMapEntry] = []
            entries.reserveCapacity(n)
            var lastKeyEncoded: Data?
            var keyEncodings = Set<Data>()
            for _ in 0..<n {
                let keyStart = r.cursor
                let k = try parseItem(&r, depth: depth + 1, recordingTo: &ranges)
                let keyBytes = Data(r.bytes[keyStart..<r.cursor])
                if !keyEncodings.insert(keyBytes).inserted {
                    throw CBORError.duplicateMapKey(at: keyStart)
                }
                if enforceCanonicalMaps, let prev = lastKeyEncoded,
                   !CBOREncoder.lexicographicallyLess(prev, keyBytes) {
                    throw CBORError.unsortedMapKeys(at: keyStart)
                }
                lastKeyEncoded = keyBytes
                let v = try parseItem(&r, depth: depth + 1, recordingTo: &ranges)
                entries.append(.init(key: k, value: v))
            }
            value = .map(entries)
        case 6:
            let inner = try parseItem(&r, depth: depth + 1, recordingTo: &ranges)
            value = .tagged(head.argument, inner)
        case 7:
            switch head.info {
            case 20: value = .bool(false)
            case 21: value = .bool(true)
            case 22: value = .null
            case 23: value = .undefined
            case 25, 26, 27:
                throw CBORError.unsupportedFloatType(at: start)
            default:
                throw CBORError.unsupportedSimpleValue(value: head.info, at: start)
            }
        default:
            // major can only be 0..7; this is unreachable
            throw CBORError.unsupportedSimpleValue(value: head.info, at: start)
        }
        ranges.append(start..<r.cursor)
        return value
    }
}

extension Range where Bound == Int {
    func advanced(by offset: Int) -> Range<Int> {
        return (self.lowerBound + offset)..<(self.upperBound + offset)
    }
}
