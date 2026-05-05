// SPDX-License-Identifier: MIT
import XCTest
@testable import SmartHealthCheckinCBOR

final class CBOREncodingTests: XCTestCase {
    func testIntegerEncoding() {
        // RFC 8949 examples
        XCTAssertEqual(CBOREncoder.encode(.unsigned(0)).hex, "00")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(1)).hex, "01")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(23)).hex, "17")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(24)).hex, "1818")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(25)).hex, "1819")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(100)).hex, "1864")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(1000)).hex, "1903e8")
        XCTAssertEqual(CBOREncoder.encode(.unsigned(1_000_000)).hex, "1a000f4240")
        XCTAssertEqual(CBOREncoder.encode(.int(-1)).hex, "20")
        XCTAssertEqual(CBOREncoder.encode(.int(-10)).hex, "29")
        XCTAssertEqual(CBOREncoder.encode(.int(-100)).hex, "3863")
        XCTAssertEqual(CBOREncoder.encode(.int(-1000)).hex, "3903e7")
    }

    func testStringsAndBytes() {
        XCTAssertEqual(CBOREncoder.encode(.textString("")).hex, "60")
        XCTAssertEqual(CBOREncoder.encode(.textString("a")).hex, "6161")
        XCTAssertEqual(CBOREncoder.encode(.textString("IETF")).hex, "6449455446")
        XCTAssertEqual(CBOREncoder.encode(.byteString(Data([0x01,0x02,0x03,0x04]))).hex, "4401020304")
    }

    func testArraysAndMaps() {
        XCTAssertEqual(CBOREncoder.encode(.array([])).hex, "80")
        XCTAssertEqual(CBOREncoder.encode(.array([.unsigned(1), .unsigned(2), .unsigned(3)])).hex, "83010203")
        XCTAssertEqual(CBOREncoder.encode(.map([])).hex, "a0")
        // Per RFC 8949 deterministic encoding map keys sort by their encoding.
        // For COSE_Key {1:2, -1:1, -2: bstr, -3: bstr} the sort order is
        // 1 (0x01) < -1 (0x20) < -2 (0x21) < -3 (0x22).
        let coseKey = CBOR.map([
            .init(key: .int(1), value: .int(2)),
            .init(key: .int(-1), value: .int(1)),
            .init(key: .int(-2), value: .byteString(Data(repeating: 0xAA, count: 4))),
            .init(key: .int(-3), value: .byteString(Data(repeating: 0xBB, count: 4))),
        ])
        let bytes = CBOREncoder.encode(coseKey)
        // a4 (map of 4)  01 02   20 01   21 44 aaaaaaaa   22 44 bbbbbbbb
        XCTAssertEqual(bytes.hex, "a40102200121" + "44aaaaaaaa" + "2244bbbbbbbb")
    }

    func testEncoderSortsAndDecoderEnforcesCanonicalOrder() throws {
        let unsorted = CBOR.map([
            .init(key: .textString("b"), value: .unsigned(2)),
            .init(key: .textString("a"), value: .unsigned(1)),
        ])
        let bytes = CBOREncoder.encode(unsorted)
        let decoded = try CBORDecoder.strict.decode(bytes)
        guard case .map(let entries) = decoded else { return XCTFail() }
        XCTAssertEqual(entries.first?.key, .textString("a"))

        // Hand-craft a non-canonical encoding (keys "b" then "a") and check
        // strict decoder rejects it.
        let nonCanonical = Data([0xA2,
                                 0x61, UInt8(ascii: "b"), 0x02,
                                 0x61, UInt8(ascii: "a"), 0x01])
        XCTAssertThrowsError(try CBORDecoder.strict.decode(nonCanonical)) { e in
            guard let ce = e as? CBORError, case .unsortedMapKeys = ce else {
                return XCTFail("expected .unsortedMapKeys, got \(e)")
            }
        }
        // Lenient decoder still rejects duplicates but accepts order.
        XCTAssertNoThrow(try CBORDecoder.lenient.decode(nonCanonical))
    }

    func testDecoderRejectsNonShortestIntEncoding() {
        // value 0 encoded as 0x18 0x00 (info=24 with arg < 24) is non-canonical
        let bad = Data([0x18, 0x00])
        XCTAssertThrowsError(try CBORDecoder.strict.decode(bad)) { e in
            guard let ce = e as? CBORError, case .nonCanonicalLengthEncoding = ce else {
                return XCTFail("expected .nonCanonicalLengthEncoding, got \(e)")
            }
        }
    }

    func testDecoderRejectsIndefiniteLength() {
        let arr = Data([0x9F, 0x01, 0xFF])
        XCTAssertThrowsError(try CBORDecoder.strict.decode(arr)) { e in
            guard let ce = e as? CBORError, case .unsupportedIndefiniteLength = ce else {
                return XCTFail("expected indefinite-length rejection")
            }
        }
    }

    func testDecoderRejectsFloats() {
        let f64 = Data([0xFB, 0,0,0,0,0,0,0,0])
        XCTAssertThrowsError(try CBORDecoder.strict.decode(f64))
    }

    func testTag24RoundTrip() throws {
        let inner = CBOR.array([.unsigned(1), .textString("x")])
        let wrapped = CBOR.tag24(inner)
        let bytes = CBOREncoder.encode(wrapped)
        let decoded = try CBORDecoder.strict.decode(bytes)
        // The outer is a Tag(24, bstr) ...
        guard case .tagged(24, .byteString(let inner1)) = decoded else { return XCTFail() }
        // ... whose contents decode to the original inner.
        let innerDecoded = try CBORDecoder.strict.decode(inner1)
        XCTAssertEqual(innerDecoded, inner)
    }
}

final class CBORSliceTests: XCTestCase {
    func testSlicesAreExactBytes() throws {
        // [1, 2, [3, 4]]
        let value = CBOR.array([
            .unsigned(1), .unsigned(2),
            .array([.unsigned(3), .unsigned(4)])
        ])
        let bytes = CBOREncoder.encode(value)
        let decoded = try CBORDecoder.strict.decodeWithSlices(bytes)
        let third = try decoded.slice(at: [.index(2)])
        // The slice for the inner array is "82 03 04"
        XCTAssertEqual(third.source.hex, "820304")
        XCTAssertEqual(third.value, .array([.unsigned(3), .unsigned(4)]))
    }

    func testTag24InnerSlice() throws {
        let inner = CBOR.array([.unsigned(7), .textString("hi")])
        let wrapped = CBOR.tag24(inner)
        // an outer container so it's not the top-level item
        let outer = CBOR.array([.unsigned(0), wrapped])
        let bytes = CBOREncoder.encode(outer)
        let decoded = try CBORDecoder.strict.decodeWithSlices(bytes)
        let drilled = try decoded.slice(at: [.index(1), .tag24Inner])
        XCTAssertEqual(drilled.value, inner)
        // inner source bytes equal the bstr contents we stored at encode time.
        XCTAssertEqual(drilled.source, CBOREncoder.encode(inner))
    }

    func testMapValueSlicesAreExact() throws {
        let map = CBOR.map([
            .init(key: .textString("a"), value: .unsigned(1)),
            .init(key: .textString("b"), value: .array([.unsigned(2), .unsigned(3)])),
        ])
        let bytes = CBOREncoder.encode(map)
        let decoded = try CBORDecoder.strict.decodeWithSlices(bytes)
        let bSlice = try decoded.slice(at: [.key(.textString("b"))])
        XCTAssertEqual(bSlice.source.hex, "820203")
    }
}

extension Data {
    var hex: String {
        return self.map { String(format: "%02x", $0) }.joined()
    }
}
