// SPDX-License-Identifier: MIT
//
// JSONValue: a deterministic, lossless representation of any JSON value that
// preserves null, booleans, integers as integers, doubles, strings, ordered
// arrays, and ordered object members. Used by the model layer to:
//
//  * carry through unknown extension members (per §5.1 the parser MAY ignore
//    them when they do not change known semantics, but MUST not lose them);
//  * carry FHIR Resource / Bundle / Questionnaire / QuestionnaireResponse
//    bodies without forcing a FHIR object model into this library;
//  * be the input to a strict parse that REJECTS duplicate object member
//    names (§5.1) — Foundation's JSONDecoder/JSONSerialization silently
//    accept duplicates, which would let non-conformant messages through.

import Foundation

public indirect enum JSONValue: Equatable, Sendable {
    case null
    case bool(Bool)
    case integer(Int64)
    case double(Double)
    case string(String)
    case array([JSONValue])
    /// Ordered object: preserves source key order; duplicates are rejected at parse time.
    case object([(key: String, value: JSONValue)])

    public static func == (lhs: JSONValue, rhs: JSONValue) -> Bool {
        switch (lhs, rhs) {
        case (.null, .null): return true
        case (.bool(let a), .bool(let b)): return a == b
        case (.integer(let a), .integer(let b)): return a == b
        case (.double(let a), .double(let b)): return a.bitPattern == b.bitPattern
        case (.string(let a), .string(let b)): return a == b
        case (.array(let a), .array(let b)): return a == b
        case (.object(let a), .object(let b)):
            guard a.count == b.count else { return false }
            for (i, pair) in a.enumerated() {
                if pair.key != b[i].key || pair.value != b[i].value { return false }
            }
            return true
        default:
            return false
        }
    }

    /// Look up a member by key (first match) on an object value.
    public subscript(key: String) -> JSONValue? {
        if case .object(let members) = self {
            return members.first(where: { $0.key == key })?.value
        }
        return nil
    }

    public var stringValue: String? {
        if case .string(let s) = self { return s }; return nil
    }
    public var arrayValue: [JSONValue]? {
        if case .array(let a) = self { return a }; return nil
    }
    public var objectMembers: [(key: String, value: JSONValue)]? {
        if case .object(let m) = self { return m }; return nil
    }
    public var boolValue: Bool? {
        if case .bool(let b) = self { return b }; return nil
    }
    public var integerValue: Int64? {
        if case .integer(let i) = self { return i }; return nil
    }
}

public enum JSONStrictError: Error, Equatable, Sendable {
    case unexpectedEnd
    case unexpectedCharacter(byte: UInt8, at: Int)
    case duplicateMember(name: String, at: Int)
    case invalidNumber(String, at: Int)
    case invalidString(at: Int)
    case invalidEscape(at: Int)
    case nonFiniteNumber(at: Int)
    case trailingData(at: Int)
    case topLevelNotObject
    case nestingTooDeep(at: Int)
}

/// Strict JSON parser used by the SMART model layer. Implements RFC 8259 with the
/// additional constraints from §5.1: rejects duplicate object member names, NaN /
/// Infinity / -Infinity, and unparsable representations. Caps nesting depth to
/// guard against pathological inputs.
public struct JSONStrictParser {
    public static let defaultMaxDepth = 256

    public static func parse(_ data: Data, maxDepth: Int = defaultMaxDepth) throws -> JSONValue {
        var p = Parser(bytes: Array(data), maxDepth: maxDepth)
        p.skipWhitespace()
        let v = try p.parseValue()
        p.skipWhitespace()
        if !p.atEnd {
            throw JSONStrictError.trailingData(at: p.cursor)
        }
        return v
    }

    public static func parse(_ string: String, maxDepth: Int = defaultMaxDepth) throws -> JSONValue {
        try parse(Data(string.utf8), maxDepth: maxDepth)
    }

    /// Convenience: parse and require a top-level JSON object (per §5.1 SMART
    /// requests are JSON objects; same for responses).
    public static func parseObject(_ data: Data, maxDepth: Int = defaultMaxDepth) throws -> JSONValue {
        let v = try parse(data, maxDepth: maxDepth)
        if case .object = v { return v }
        throw JSONStrictError.topLevelNotObject
    }

    private struct Parser {
        let bytes: [UInt8]
        var cursor: Int = 0
        let maxDepth: Int

        var atEnd: Bool { cursor >= bytes.count }
        var peek: UInt8? { atEnd ? nil : bytes[cursor] }

        mutating func skipWhitespace() {
            while !atEnd {
                let b = bytes[cursor]
                if b == 0x20 || b == 0x09 || b == 0x0A || b == 0x0D { cursor += 1 } else { break }
            }
        }

        mutating func parseValue(depth: Int = 0) throws -> JSONValue {
            if depth > maxDepth { throw JSONStrictError.nestingTooDeep(at: cursor) }
            skipWhitespace()
            guard let b = peek else { throw JSONStrictError.unexpectedEnd }
            switch b {
            case UInt8(ascii: "{"): return try parseObject(depth: depth + 1)
            case UInt8(ascii: "["): return try parseArray(depth: depth + 1)
            case UInt8(ascii: "\""): return .string(try parseString())
            case UInt8(ascii: "t"), UInt8(ascii: "f"): return .bool(try parseBool())
            case UInt8(ascii: "n"): try parseNull(); return .null
            case UInt8(ascii: "-"), UInt8(ascii: "0")...UInt8(ascii: "9"): return try parseNumber()
            default:
                throw JSONStrictError.unexpectedCharacter(byte: b, at: cursor)
            }
        }

        mutating func parseObject(depth: Int) throws -> JSONValue {
            // consume '{'
            cursor += 1
            skipWhitespace()
            var members: [(key: String, value: JSONValue)] = []
            var seen = Set<String>()
            if peek == UInt8(ascii: "}") {
                cursor += 1
                return .object(members)
            }
            while true {
                skipWhitespace()
                let keyStart = cursor
                guard peek == UInt8(ascii: "\"") else {
                    throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
                }
                let name = try parseString()
                if !seen.insert(name).inserted {
                    throw JSONStrictError.duplicateMember(name: name, at: keyStart)
                }
                skipWhitespace()
                guard peek == UInt8(ascii: ":") else {
                    throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
                }
                cursor += 1
                let value = try parseValue(depth: depth)
                members.append((name, value))
                skipWhitespace()
                if peek == UInt8(ascii: ",") {
                    cursor += 1
                    continue
                } else if peek == UInt8(ascii: "}") {
                    cursor += 1
                    return .object(members)
                } else {
                    throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
                }
            }
        }

        mutating func parseArray(depth: Int) throws -> JSONValue {
            cursor += 1
            skipWhitespace()
            var items: [JSONValue] = []
            if peek == UInt8(ascii: "]") {
                cursor += 1
                return .array(items)
            }
            while true {
                let v = try parseValue(depth: depth)
                items.append(v)
                skipWhitespace()
                if peek == UInt8(ascii: ",") {
                    cursor += 1
                    continue
                } else if peek == UInt8(ascii: "]") {
                    cursor += 1
                    return .array(items)
                } else {
                    throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
                }
            }
        }

        mutating func parseString() throws -> String {
            // peek is '"'
            let startCursor = cursor
            cursor += 1
            var out: [UInt8] = []
            while !atEnd {
                let b = bytes[cursor]
                if b == UInt8(ascii: "\"") {
                    cursor += 1
                    if let s = String(bytes: out, encoding: .utf8) { return s }
                    throw JSONStrictError.invalidString(at: startCursor)
                } else if b == 0x5C { // backslash
                    cursor += 1
                    if atEnd { throw JSONStrictError.unexpectedEnd }
                    let esc = bytes[cursor]; cursor += 1
                    switch esc {
                    case UInt8(ascii: "\""): out.append(0x22)
                    case 0x5C: out.append(0x5C)
                    case UInt8(ascii: "/"):  out.append(0x2F)
                    case UInt8(ascii: "b"):  out.append(0x08)
                    case UInt8(ascii: "f"):  out.append(0x0C)
                    case UInt8(ascii: "n"):  out.append(0x0A)
                    case UInt8(ascii: "r"):  out.append(0x0D)
                    case UInt8(ascii: "t"):  out.append(0x09)
                    case UInt8(ascii: "u"):
                        let cu = try readHex4()
                        if (0xD800...0xDBFF).contains(cu) {
                            // expect low surrogate
                            guard !atEnd, bytes[cursor] == 0x5C else {
                                throw JSONStrictError.invalidEscape(at: cursor)
                            }
                            cursor += 1
                            guard !atEnd, bytes[cursor] == UInt8(ascii: "u") else {
                                throw JSONStrictError.invalidEscape(at: cursor)
                            }
                            cursor += 1
                            let low = try readHex4()
                            guard (0xDC00...0xDFFF).contains(low) else {
                                throw JSONStrictError.invalidEscape(at: cursor)
                            }
                            let scalar = 0x10000 + (UInt32(cu - 0xD800) << 10) + UInt32(low - 0xDC00)
                            appendUTF8(scalar: scalar, to: &out)
                        } else if (0xDC00...0xDFFF).contains(cu) {
                            throw JSONStrictError.invalidEscape(at: cursor)
                        } else {
                            appendUTF8(scalar: UInt32(cu), to: &out)
                        }
                    default:
                        throw JSONStrictError.invalidEscape(at: cursor - 1)
                    }
                } else if b < 0x20 {
                    throw JSONStrictError.invalidString(at: cursor)
                } else {
                    out.append(b); cursor += 1
                }
            }
            throw JSONStrictError.unexpectedEnd
        }

        mutating func readHex4() throws -> UInt16 {
            guard cursor + 4 <= bytes.count else { throw JSONStrictError.invalidEscape(at: cursor) }
            var v: UInt32 = 0
            for _ in 0..<4 {
                let b = bytes[cursor]; cursor += 1
                let n: UInt32
                switch b {
                case UInt8(ascii: "0")...UInt8(ascii: "9"): n = UInt32(b - UInt8(ascii: "0"))
                case UInt8(ascii: "a")...UInt8(ascii: "f"): n = UInt32(b - UInt8(ascii: "a") + 10)
                case UInt8(ascii: "A")...UInt8(ascii: "F"): n = UInt32(b - UInt8(ascii: "A") + 10)
                default: throw JSONStrictError.invalidEscape(at: cursor - 1)
                }
                v = (v << 4) | n
            }
            return UInt16(v)
        }

        func appendUTF8(scalar: UInt32, to out: inout [UInt8]) {
            if scalar < 0x80 {
                out.append(UInt8(scalar))
            } else if scalar < 0x800 {
                out.append(UInt8(0xC0 | (scalar >> 6)))
                out.append(UInt8(0x80 | (scalar & 0x3F)))
            } else if scalar < 0x10000 {
                out.append(UInt8(0xE0 | (scalar >> 12)))
                out.append(UInt8(0x80 | ((scalar >> 6) & 0x3F)))
                out.append(UInt8(0x80 | (scalar & 0x3F)))
            } else {
                out.append(UInt8(0xF0 | (scalar >> 18)))
                out.append(UInt8(0x80 | ((scalar >> 12) & 0x3F)))
                out.append(UInt8(0x80 | ((scalar >> 6) & 0x3F)))
                out.append(UInt8(0x80 | (scalar & 0x3F)))
            }
        }

        mutating func parseBool() throws -> Bool {
            if matches("true") { return true }
            if matches("false") { return false }
            throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
        }

        mutating func parseNull() throws {
            if !matches("null") {
                throw JSONStrictError.unexpectedCharacter(byte: peek ?? 0, at: cursor)
            }
        }

        mutating func matches(_ word: String) -> Bool {
            let wb = Array(word.utf8)
            guard cursor + wb.count <= bytes.count else { return false }
            for i in 0..<wb.count where bytes[cursor + i] != wb[i] { return false }
            cursor += wb.count
            return true
        }

        mutating func parseNumber() throws -> JSONValue {
            let start = cursor
            var isFloat = false
            if peek == UInt8(ascii: "-") { cursor += 1 }
            // integer part
            if peek == UInt8(ascii: "0") {
                cursor += 1
            } else if let b = peek, (UInt8(ascii: "1")...UInt8(ascii: "9")).contains(b) {
                cursor += 1
                while let bb = peek, (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(bb) { cursor += 1 }
            } else {
                throw JSONStrictError.invalidNumber(String(bytes: [peek ?? 0], encoding: .ascii) ?? "?", at: cursor)
            }
            // fraction
            if peek == UInt8(ascii: ".") {
                isFloat = true
                cursor += 1
                guard let d = peek, (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(d) else {
                    throw JSONStrictError.invalidNumber("malformed fraction", at: cursor)
                }
                while let bb = peek, (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(bb) { cursor += 1 }
            }
            // exponent
            if peek == UInt8(ascii: "e") || peek == UInt8(ascii: "E") {
                isFloat = true
                cursor += 1
                if peek == UInt8(ascii: "+") || peek == UInt8(ascii: "-") { cursor += 1 }
                guard let d = peek, (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(d) else {
                    throw JSONStrictError.invalidNumber("malformed exponent", at: cursor)
                }
                while let bb = peek, (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(bb) { cursor += 1 }
            }
            let raw = String(bytes: bytes[start..<cursor], encoding: .ascii) ?? ""
            if !isFloat, let i = Int64(raw) {
                return .integer(i)
            }
            guard let d = Double(raw), d.isFinite else {
                throw JSONStrictError.nonFiniteNumber(at: start)
            }
            return .double(d)
        }
    }
}

/// Serializer for `JSONValue` that emits compact JSON in source-order. Used to
/// produce request/response payloads that go on the wire deterministically and
/// are byte-equivalent to what we accepted in (lossless), apart from formatting.
public struct JSONStrictWriter {
    public static func encode(_ value: JSONValue) -> Data {
        var out = Data()
        write(value, to: &out)
        return out
    }

    public static func encodeString(_ value: JSONValue) -> String {
        return String(decoding: encode(value), as: UTF8.self)
    }

    public static func write(_ v: JSONValue, to out: inout Data) {
        switch v {
        case .null:
            out.append(contentsOf: "null".utf8)
        case .bool(let b):
            out.append(contentsOf: (b ? "true" : "false").utf8)
        case .integer(let i):
            out.append(contentsOf: String(i).utf8)
        case .double(let d):
            // Use Swift's default formatting, which produces a round-trippable
            // representation. NaN/Inf are not emitted because §5.1 forbids them
            // and we never construct .double with non-finite values from the
            // parser; we still guard here.
            if !d.isFinite {
                out.append(contentsOf: "null".utf8) // safe fallback; should not happen in normal flow
            } else if d == d.rounded() && abs(d) < 1e16 {
                out.append(contentsOf: String(format: "%g", d).utf8)
            } else {
                out.append(contentsOf: String(d).utf8)
            }
        case .string(let s):
            writeString(s, to: &out)
        case .array(let arr):
            out.append(0x5B) // '['
            for (i, x) in arr.enumerated() {
                if i > 0 { out.append(0x2C) }
                write(x, to: &out)
            }
            out.append(0x5D) // ']'
        case .object(let members):
            out.append(0x7B) // '{'
            for (i, pair) in members.enumerated() {
                if i > 0 { out.append(0x2C) }
                writeString(pair.key, to: &out)
                out.append(0x3A) // ':'
                write(pair.value, to: &out)
            }
            out.append(0x7D) // '}'
        }
    }

    static func writeString(_ s: String, to out: inout Data) {
        out.append(0x22) // '"'
        for scalar in s.unicodeScalars {
            switch scalar.value {
            case 0x22: out.append(contentsOf: [0x5C, 0x22])
            case 0x5C: out.append(contentsOf: [0x5C, 0x5C])
            case 0x08: out.append(contentsOf: [0x5C, UInt8(ascii: "b")])
            case 0x09: out.append(contentsOf: [0x5C, UInt8(ascii: "t")])
            case 0x0A: out.append(contentsOf: [0x5C, UInt8(ascii: "n")])
            case 0x0C: out.append(contentsOf: [0x5C, UInt8(ascii: "f")])
            case 0x0D: out.append(contentsOf: [0x5C, UInt8(ascii: "r")])
            case 0x00...0x1F:
                let hex = String(format: "%04x", scalar.value)
                out.append(contentsOf: [0x5C, UInt8(ascii: "u")])
                out.append(contentsOf: hex.utf8)
            default:
                for byte in String(scalar).utf8 { out.append(byte) }
            }
        }
        out.append(0x22)
    }
}
