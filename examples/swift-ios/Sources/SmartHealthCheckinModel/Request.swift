// SPDX-License-Identifier: MIT
//
// Clinical request model from §5 of SMART Health Check-in 1.0.
//
// Design notes:
//
//  * The Swift types preserve unknown extension members verbatim through the
//    `extensionMembers` dictionary on each shape, so a Verifier or Wallet can
//    parse, optionally inspect, and re-emit a request without losing data.
//
//  * The model deliberately does not encode or interpret FHIR semantics. The
//    inline FHIR Questionnaire body is carried as a `JSONValue` so the layer
//    here stays FHIR-version-agnostic.
//
//  * Per §5.1 we use the strict JSON parser that rejects duplicate object
//    member names. Foundation's JSONDecoder/JSONSerialization silently accept
//    duplicates, which would let non-conformant messages through.

import Foundation

/// A SMART Health Check-in request (§5.2).
public struct SmartHealthCheckinRequest: Equatable, Sendable {
    public var type: String
    public var version: String
    public var id: String
    public var purpose: String?
    public var fhirVersions: [String]?
    public var items: [Item]
    /// Unknown top-level members preserved in source order.
    public var extensionMembers: [(key: String, value: JSONValue)]

    public init(
        id: String,
        items: [Item],
        purpose: String? = nil,
        fhirVersions: [String]? = nil,
        version: String = SmartHealthCheckinConstants.modelVersion,
        type: String = SmartHealthCheckinConstants.requestType,
        extensionMembers: [(key: String, value: JSONValue)] = []
    ) {
        self.type = type
        self.version = version
        self.id = id
        self.purpose = purpose
        self.fhirVersions = fhirVersions
        self.items = items
        self.extensionMembers = extensionMembers
    }

    public static func == (lhs: SmartHealthCheckinRequest, rhs: SmartHealthCheckinRequest) -> Bool {
        guard lhs.type == rhs.type, lhs.version == rhs.version, lhs.id == rhs.id,
              lhs.purpose == rhs.purpose, lhs.fhirVersions == rhs.fhirVersions,
              lhs.items == rhs.items,
              lhs.extensionMembers.count == rhs.extensionMembers.count
        else { return false }
        for (i, m) in lhs.extensionMembers.enumerated() {
            if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
        }
        return true
    }

    public struct Item: Equatable, Sendable {
        public var id: String
        public var title: String
        public var summary: String?
        public var required: Bool?
        public var content: Selector
        public var accept: [String]
        public var extensionMembers: [(key: String, value: JSONValue)]

        public init(
            id: String,
            title: String,
            content: Selector,
            accept: [String],
            summary: String? = nil,
            required: Bool? = nil,
            extensionMembers: [(key: String, value: JSONValue)] = []
        ) {
            self.id = id
            self.title = title
            self.content = content
            self.accept = accept
            self.summary = summary
            self.required = required
            self.extensionMembers = extensionMembers
        }

        public static func == (lhs: Item, rhs: Item) -> Bool {
            guard lhs.id == rhs.id, lhs.title == rhs.title, lhs.summary == rhs.summary,
                  lhs.required == rhs.required, lhs.content == rhs.content,
                  lhs.accept == rhs.accept,
                  lhs.extensionMembers.count == rhs.extensionMembers.count
            else { return false }
            for (i, m) in lhs.extensionMembers.enumerated() {
                if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
            }
            return true
        }
    }

    public enum Selector: Equatable, Sendable {
        case selectionFhir(SelectionFhir)
        case formFhir(FormFhir)
        /// An extension selector with an unrecognized `kind`. The wallet/verifier
        /// must NOT silently treat unknown selector kinds as a known one.
        case ext(kind: String, members: [(key: String, value: JSONValue)])

        public var kind: String {
            switch self {
            case .selectionFhir: return SmartHealthCheckinConstants.selectorKindSelectionFhir
            case .formFhir:      return SmartHealthCheckinConstants.selectorKindFormFhir
            case .ext(let k, _): return k
            }
        }

        public static func == (lhs: Selector, rhs: Selector) -> Bool {
            switch (lhs, rhs) {
            case (.selectionFhir(let a), .selectionFhir(let b)): return a == b
            case (.formFhir(let a),      .formFhir(let b)):      return a == b
            case (.ext(let ka, let ma), .ext(let kb, let mb)):
                if ka != kb || ma.count != mb.count { return false }
                for (i, m) in ma.enumerated() {
                    if m.key != mb[i].key || m.value != mb[i].value { return false }
                }
                return true
            default: return false
            }
        }
    }

    public struct SelectionFhir: Equatable, Sendable {
        public var profiles: [String]?
        public var profilesFrom: [String]?
        public var resourceTypes: [String]?
        public var extensionMembers: [(key: String, value: JSONValue)]

        public init(profiles: [String]? = nil, profilesFrom: [String]? = nil, resourceTypes: [String]? = nil, extensionMembers: [(key: String, value: JSONValue)] = []) {
            self.profiles = profiles; self.profilesFrom = profilesFrom; self.resourceTypes = resourceTypes; self.extensionMembers = extensionMembers
        }

        public static func == (lhs: SelectionFhir, rhs: SelectionFhir) -> Bool {
            guard lhs.profiles == rhs.profiles, lhs.profilesFrom == rhs.profilesFrom, lhs.resourceTypes == rhs.resourceTypes,
                  lhs.extensionMembers.count == rhs.extensionMembers.count
            else { return false }
            for (i, m) in lhs.extensionMembers.enumerated() {
                if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
            }
            return true
        }
    }

    public struct FormFhir: Equatable, Sendable {
        public var questionnaireCanonical: String?
        public var questionnaire: JSONValue?
        public var extensionMembers: [(key: String, value: JSONValue)]

        public init(questionnaireCanonical: String? = nil, questionnaire: JSONValue? = nil, extensionMembers: [(key: String, value: JSONValue)] = []) {
            self.questionnaireCanonical = questionnaireCanonical
            self.questionnaire = questionnaire
            self.extensionMembers = extensionMembers
        }

        public static func == (lhs: FormFhir, rhs: FormFhir) -> Bool {
            guard lhs.questionnaireCanonical == rhs.questionnaireCanonical,
                  lhs.questionnaire == rhs.questionnaire,
                  lhs.extensionMembers.count == rhs.extensionMembers.count
            else { return false }
            for (i, m) in lhs.extensionMembers.enumerated() {
                if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
            }
            return true
        }
    }
}

public extension SmartHealthCheckinRequest {
    /// Parse a SMART request from JSON bytes, applying §5.1 strictness rules.
    static func parse(_ data: Data) throws -> SmartHealthCheckinRequest {
        let v = try JSONStrictParser.parseObject(data)
        return try fromJSON(v)
    }

    static func parse(_ string: String) throws -> SmartHealthCheckinRequest {
        try parse(Data(string.utf8))
    }

    /// Encode a SMART request to compact UTF-8 JSON.
    func toJSONData() -> Data {
        JSONStrictWriter.encode(toJSON())
    }

    func toJSONString() -> String {
        JSONStrictWriter.encodeString(toJSON())
    }

    func toJSON() -> JSONValue {
        var o: [(key: String, value: JSONValue)] = []
        o.append(("type", .string(type)))
        o.append(("version", .string(version)))
        o.append(("id", .string(id)))
        if let purpose = purpose { o.append(("purpose", .string(purpose))) }
        if let fhirVersions = fhirVersions {
            o.append(("fhirVersions", .array(fhirVersions.map { .string($0) })))
        }
        o.append(("items", .array(items.map { $0.toJSON() })))
        for em in extensionMembers { o.append((em.key, em.value)) }
        return .object(o)
    }

    static func fromJSON(_ v: JSONValue) throws -> SmartHealthCheckinRequest {
        guard let members = v.objectMembers else {
            throw ModelDecodeError.expectedObject(path: "$")
        }
        var type: String?, version: String?, id: String?, purpose: String?
        var fhirVersions: [String]?
        var itemsRaw: [JSONValue]?
        var extras: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            switch k {
            case "type":
                type = try requireString(vv, path: "$.type")
            case "version":
                version = try requireString(vv, path: "$.version")
            case "id":
                id = try requireNonEmptyString(vv, path: "$.id")
            case "purpose":
                purpose = try requireString(vv, path: "$.purpose")
            case "fhirVersions":
                fhirVersions = try requireStringArray(vv, path: "$.fhirVersions", allowEmpty: false)
            case "items":
                guard case .array(let a) = vv else { throw ModelDecodeError.expectedArray(path: "$.items") }
                itemsRaw = a
            default:
                extras.append((k, vv))
            }
        }
        guard let type = type else { throw ModelDecodeError.missing(path: "$.type") }
        guard let version = version else { throw ModelDecodeError.missing(path: "$.version") }
        guard let id = id else { throw ModelDecodeError.missing(path: "$.id") }
        guard let itemsRaw = itemsRaw else { throw ModelDecodeError.missing(path: "$.items") }

        let items = try itemsRaw.enumerated().map { try Item.fromJSON($1, path: "$.items[\($0)]") }
        return SmartHealthCheckinRequest(
            id: id, items: items, purpose: purpose, fhirVersions: fhirVersions,
            version: version, type: type, extensionMembers: extras
        )
    }
}

public extension SmartHealthCheckinRequest.Item {
    func toJSON() -> JSONValue {
        var o: [(key: String, value: JSONValue)] = []
        o.append(("id", .string(id)))
        o.append(("title", .string(title)))
        if let summary = summary { o.append(("summary", .string(summary))) }
        if let required = required { o.append(("required", .bool(required))) }
        o.append(("content", content.toJSON()))
        o.append(("accept", .array(accept.map { .string($0) })))
        for em in extensionMembers { o.append((em.key, em.value)) }
        return .object(o)
    }

    static func fromJSON(_ v: JSONValue, path: String) throws -> SmartHealthCheckinRequest.Item {
        guard let members = v.objectMembers else { throw ModelDecodeError.expectedObject(path: path) }
        var id: String?, title: String?, summary: String?, required: Bool?
        var content: SmartHealthCheckinRequest.Selector?
        var accept: [String]?
        var extras: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            switch k {
            case "id":      id = try requireNonEmptyString(vv, path: "\(path).id")
            case "title":   title = try requireNonEmptyString(vv, path: "\(path).title")
            case "summary": summary = try requireString(vv, path: "\(path).summary")
            case "required":
                guard case .bool(let b) = vv else { throw ModelDecodeError.expectedBool(path: "\(path).required") }
                required = b
            case "content":
                content = try SmartHealthCheckinRequest.Selector.fromJSON(vv, path: "\(path).content")
            case "accept":
                accept = try requireStringArray(vv, path: "\(path).accept", allowEmpty: false)
            default:
                extras.append((k, vv))
            }
        }
        guard let id = id else { throw ModelDecodeError.missing(path: "\(path).id") }
        guard let title = title else { throw ModelDecodeError.missing(path: "\(path).title") }
        guard let content = content else { throw ModelDecodeError.missing(path: "\(path).content") }
        guard let accept = accept else { throw ModelDecodeError.missing(path: "\(path).accept") }
        return SmartHealthCheckinRequest.Item(id: id, title: title, content: content, accept: accept, summary: summary, required: required, extensionMembers: extras)
    }
}

public extension SmartHealthCheckinRequest.Selector {
    func toJSON() -> JSONValue {
        switch self {
        case .selectionFhir(let s):
            var o: [(key: String, value: JSONValue)] = [("kind", .string(SmartHealthCheckinConstants.selectorKindSelectionFhir))]
            if let p = s.profiles { o.append(("profiles", .array(p.map { .string($0) }))) }
            if let pf = s.profilesFrom { o.append(("profilesFrom", .array(pf.map { .string($0) }))) }
            if let rt = s.resourceTypes { o.append(("resourceTypes", .array(rt.map { .string($0) }))) }
            for em in s.extensionMembers { o.append((em.key, em.value)) }
            return .object(o)
        case .formFhir(let f):
            var o: [(key: String, value: JSONValue)] = [("kind", .string(SmartHealthCheckinConstants.selectorKindFormFhir))]
            if let qc = f.questionnaireCanonical { o.append(("questionnaireCanonical", .string(qc))) }
            if let q = f.questionnaire { o.append(("questionnaire", q)) }
            for em in f.extensionMembers { o.append((em.key, em.value)) }
            return .object(o)
        case .ext(let k, let m):
            var o: [(key: String, value: JSONValue)] = [("kind", .string(k))]
            for em in m { o.append((em.key, em.value)) }
            return .object(o)
        }
    }

    static func fromJSON(_ v: JSONValue, path: String) throws -> SmartHealthCheckinRequest.Selector {
        guard let members = v.objectMembers else { throw ModelDecodeError.expectedObject(path: path) }
        var kind: String?
        var others: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            if k == "kind" {
                kind = try requireNonEmptyString(vv, path: "\(path).kind")
            } else {
                others.append((k, vv))
            }
        }
        guard let kind = kind else { throw ModelDecodeError.missing(path: "\(path).kind") }
        switch kind {
        case SmartHealthCheckinConstants.selectorKindSelectionFhir:
            var profiles: [String]?, profilesFrom: [String]?, resourceTypes: [String]?
            var extras: [(key: String, value: JSONValue)] = []
            for (k, vv) in others {
                switch k {
                case "profiles":      profiles = try requireStringArray(vv, path: "\(path).profiles", allowEmpty: false)
                case "profilesFrom":  profilesFrom = try requireStringArray(vv, path: "\(path).profilesFrom", allowEmpty: false)
                case "resourceTypes": resourceTypes = try requireStringArray(vv, path: "\(path).resourceTypes", allowEmpty: false)
                case "questionnaireCanonical", "questionnaire":
                    throw ModelDecodeError.invalid(path: "\(path).\(k)", reason: "MUST NOT be present on selection.fhir")
                default:
                    extras.append((k, vv))
                }
            }
            return .selectionFhir(.init(profiles: profiles, profilesFrom: profilesFrom, resourceTypes: resourceTypes, extensionMembers: extras))
        case SmartHealthCheckinConstants.selectorKindFormFhir:
            var qc: String?
            var q: JSONValue?
            var extras: [(key: String, value: JSONValue)] = []
            for (k, vv) in others {
                switch k {
                case "questionnaireCanonical": qc = try requireNonEmptyString(vv, path: "\(path).questionnaireCanonical")
                case "questionnaire":          q = vv
                case "profiles", "profilesFrom", "resourceTypes":
                    throw ModelDecodeError.invalid(path: "\(path).\(k)", reason: "MUST NOT be present on form.fhir")
                default:
                    extras.append((k, vv))
                }
            }
            return .formFhir(.init(questionnaireCanonical: qc, questionnaire: q, extensionMembers: extras))
        default:
            return .ext(kind: kind, members: others)
        }
    }
}

public enum ModelDecodeError: Error, Equatable, Sendable, CustomStringConvertible {
    case missing(path: String)
    case expectedString(path: String)
    case expectedNonEmptyString(path: String)
    case expectedArray(path: String)
    case expectedObject(path: String)
    case expectedBool(path: String)
    case expectedStringArray(path: String)
    case invalid(path: String, reason: String)

    public var description: String {
        switch self {
        case .missing(let p):                 return "Missing required member at \(p)"
        case .expectedString(let p):          return "Expected string at \(p)"
        case .expectedNonEmptyString(let p):  return "Expected non-empty string at \(p)"
        case .expectedArray(let p):           return "Expected array at \(p)"
        case .expectedObject(let p):          return "Expected object at \(p)"
        case .expectedBool(let p):            return "Expected boolean at \(p)"
        case .expectedStringArray(let p):     return "Expected non-empty string array at \(p)"
        case .invalid(let p, let r):          return "Invalid value at \(p): \(r)"
        }
    }
}

@inline(__always)
internal func requireString(_ v: JSONValue, path: String) throws -> String {
    guard case .string(let s) = v else { throw ModelDecodeError.expectedString(path: path) }
    return s
}
@inline(__always)
internal func requireNonEmptyString(_ v: JSONValue, path: String) throws -> String {
    guard case .string(let s) = v, !s.isEmpty else { throw ModelDecodeError.expectedNonEmptyString(path: path) }
    return s
}
@inline(__always)
internal func requireStringArray(_ v: JSONValue, path: String, allowEmpty: Bool) throws -> [String] {
    guard case .array(let a) = v else { throw ModelDecodeError.expectedStringArray(path: path) }
    if !allowEmpty && a.isEmpty { throw ModelDecodeError.expectedStringArray(path: path) }
    var out: [String] = []
    out.reserveCapacity(a.count)
    for (i, x) in a.enumerated() {
        guard case .string(let s) = x, !s.isEmpty else {
            throw ModelDecodeError.expectedNonEmptyString(path: "\(path)[\(i)]")
        }
        out.append(s)
    }
    return out
}
