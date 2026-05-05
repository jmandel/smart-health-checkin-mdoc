// SPDX-License-Identifier: MIT
//
// Clinical response model from §6 of SMART Health Check-in 1.0.

import Foundation

public struct SmartHealthCheckinResponse: Equatable, Sendable {
    public var type: String
    public var version: String
    public var requestId: String
    public var artifacts: [Artifact]
    public var requestStatus: [RequestItemStatus]
    public var extensionMembers: [(key: String, value: JSONValue)]

    public init(
        requestId: String,
        artifacts: [Artifact],
        requestStatus: [RequestItemStatus],
        version: String = SmartHealthCheckinConstants.modelVersion,
        type: String = SmartHealthCheckinConstants.responseType,
        extensionMembers: [(key: String, value: JSONValue)] = []
    ) {
        self.type = type; self.version = version
        self.requestId = requestId
        self.artifacts = artifacts; self.requestStatus = requestStatus
        self.extensionMembers = extensionMembers
    }

    public static func == (lhs: SmartHealthCheckinResponse, rhs: SmartHealthCheckinResponse) -> Bool {
        guard lhs.type == rhs.type, lhs.version == rhs.version, lhs.requestId == rhs.requestId,
              lhs.artifacts == rhs.artifacts, lhs.requestStatus == rhs.requestStatus,
              lhs.extensionMembers.count == rhs.extensionMembers.count
        else { return false }
        for (i, m) in lhs.extensionMembers.enumerated() {
            if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
        }
        return true
    }
}

/// One returned record. Per §6.1, every Artifact has `id`, `mediaType`,
/// non-empty `fulfills[]`, and media-type-specific payload fields.
public enum Artifact: Equatable, Sendable {
    case fhirJson(FhirJson)
    case smartHealthCard(SmartHealthCard)
    /// An artifact with a media type the library does not recognize as a core
    /// type. Verifiers MUST NOT treat unrecognized media types as a generic
    /// catch-all (§6.1); they remain accessible as raw JSON for explicit
    /// extension processing only.
    case ext(Extension)

    public var id: String {
        switch self {
        case .fhirJson(let a):        return a.id
        case .smartHealthCard(let a): return a.id
        case .ext(let a):             return a.id
        }
    }
    public var mediaType: String {
        switch self {
        case .fhirJson:        return SmartHealthCheckinConstants.mediaTypeFhirJson
        case .smartHealthCard: return SmartHealthCheckinConstants.mediaTypeSmartHealthCard
        case .ext(let a):      return a.mediaType
        }
    }
    public var fulfills: [String] {
        switch self {
        case .fhirJson(let a):        return a.fulfills
        case .smartHealthCard(let a): return a.fulfills
        case .ext(let a):             return a.fulfills
        }
    }

    public struct FhirJson: Equatable, Sendable {
        public var id: String
        public var fulfills: [String]
        public var fhirVersion: String
        public var value: JSONValue
        public var extensionMembers: [(key: String, value: JSONValue)]

        public init(id: String, fulfills: [String], fhirVersion: String, value: JSONValue, extensionMembers: [(key: String, value: JSONValue)] = []) {
            self.id = id; self.fulfills = fulfills; self.fhirVersion = fhirVersion; self.value = value; self.extensionMembers = extensionMembers
        }
        public static func == (lhs: FhirJson, rhs: FhirJson) -> Bool {
            guard lhs.id == rhs.id, lhs.fulfills == rhs.fulfills, lhs.fhirVersion == rhs.fhirVersion, lhs.value == rhs.value,
                  lhs.extensionMembers.count == rhs.extensionMembers.count
            else { return false }
            for (i, m) in lhs.extensionMembers.enumerated() {
                if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
            }
            return true
        }
    }

    public struct SmartHealthCard: Equatable, Sendable {
        public var id: String
        public var fulfills: [String]
        public var verifiableCredentials: [String]
        public var extensionMembers: [(key: String, value: JSONValue)]

        public init(id: String, fulfills: [String], verifiableCredentials: [String], extensionMembers: [(key: String, value: JSONValue)] = []) {
            self.id = id; self.fulfills = fulfills
            self.verifiableCredentials = verifiableCredentials; self.extensionMembers = extensionMembers
        }
        public static func == (lhs: SmartHealthCard, rhs: SmartHealthCard) -> Bool {
            guard lhs.id == rhs.id, lhs.fulfills == rhs.fulfills, lhs.verifiableCredentials == rhs.verifiableCredentials,
                  lhs.extensionMembers.count == rhs.extensionMembers.count
            else { return false }
            for (i, m) in lhs.extensionMembers.enumerated() {
                if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
            }
            return true
        }
    }

    public struct Extension: Equatable, Sendable {
        public var id: String
        public var mediaType: String
        public var fulfills: [String]
        /// Full source object including unknown members. The id, mediaType,
        /// and fulfills entries are also kept as parallel fields above for
        /// convenience; this preserves any other media-type-defined payload
        /// fields verbatim.
        public var members: [(key: String, value: JSONValue)]

        public init(id: String, mediaType: String, fulfills: [String], members: [(key: String, value: JSONValue)]) {
            self.id = id; self.mediaType = mediaType; self.fulfills = fulfills; self.members = members
        }
        public static func == (lhs: Extension, rhs: Extension) -> Bool {
            guard lhs.id == rhs.id, lhs.mediaType == rhs.mediaType, lhs.fulfills == rhs.fulfills,
                  lhs.members.count == rhs.members.count
            else { return false }
            for (i, m) in lhs.members.enumerated() {
                if m.key != rhs.members[i].key || m.value != rhs.members[i].value { return false }
            }
            return true
        }
    }
}

public struct RequestItemStatus: Equatable, Sendable {
    public enum Code: String, Sendable, Equatable {
        case fulfilled, partial, unavailable, declined, unsupported, error
    }

    public var item: String
    public var status: Code
    public var message: String?
    public var extensionMembers: [(key: String, value: JSONValue)]

    public init(item: String, status: Code, message: String? = nil, extensionMembers: [(key: String, value: JSONValue)] = []) {
        self.item = item; self.status = status; self.message = message; self.extensionMembers = extensionMembers
    }

    public static func == (lhs: RequestItemStatus, rhs: RequestItemStatus) -> Bool {
        guard lhs.item == rhs.item, lhs.status == rhs.status, lhs.message == rhs.message,
              lhs.extensionMembers.count == rhs.extensionMembers.count
        else { return false }
        for (i, m) in lhs.extensionMembers.enumerated() {
            if m.key != rhs.extensionMembers[i].key || m.value != rhs.extensionMembers[i].value { return false }
        }
        return true
    }
}

// MARK: - JSON encode / decode

public extension SmartHealthCheckinResponse {
    static func parse(_ data: Data) throws -> SmartHealthCheckinResponse {
        let v = try JSONStrictParser.parseObject(data)
        return try fromJSON(v)
    }
    static func parse(_ string: String) throws -> SmartHealthCheckinResponse {
        try parse(Data(string.utf8))
    }

    func toJSONData() -> Data { JSONStrictWriter.encode(toJSON()) }
    func toJSONString() -> String { JSONStrictWriter.encodeString(toJSON()) }

    func toJSON() -> JSONValue {
        var o: [(key: String, value: JSONValue)] = []
        o.append(("type", .string(type)))
        o.append(("version", .string(version)))
        o.append(("requestId", .string(requestId)))
        o.append(("artifacts", .array(artifacts.map { $0.toJSON() })))
        o.append(("requestStatus", .array(requestStatus.map { $0.toJSON() })))
        for em in extensionMembers { o.append((em.key, em.value)) }
        return .object(o)
    }

    static func fromJSON(_ v: JSONValue) throws -> SmartHealthCheckinResponse {
        guard let members = v.objectMembers else { throw ModelDecodeError.expectedObject(path: "$") }
        var type: String?, version: String?, requestId: String?
        var artifactsRaw: [JSONValue]?
        var statusRaw: [JSONValue]?
        var extras: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            switch k {
            case "type": type = try requireString(vv, path: "$.type")
            case "version": version = try requireString(vv, path: "$.version")
            case "requestId": requestId = try requireNonEmptyString(vv, path: "$.requestId")
            case "artifacts":
                guard case .array(let a) = vv else { throw ModelDecodeError.expectedArray(path: "$.artifacts") }
                artifactsRaw = a
            case "requestStatus":
                guard case .array(let a) = vv else { throw ModelDecodeError.expectedArray(path: "$.requestStatus") }
                statusRaw = a
            default:
                extras.append((k, vv))
            }
        }
        guard let type = type else { throw ModelDecodeError.missing(path: "$.type") }
        guard let version = version else { throw ModelDecodeError.missing(path: "$.version") }
        guard let requestId = requestId else { throw ModelDecodeError.missing(path: "$.requestId") }
        guard let artifactsRaw = artifactsRaw else { throw ModelDecodeError.missing(path: "$.artifacts") }
        guard let statusRaw = statusRaw else { throw ModelDecodeError.missing(path: "$.requestStatus") }
        let artifacts = try artifactsRaw.enumerated().map { try Artifact.fromJSON($1, path: "$.artifacts[\($0)]") }
        let requestStatus = try statusRaw.enumerated().map { try RequestItemStatus.fromJSON($1, path: "$.requestStatus[\($0)]") }
        return SmartHealthCheckinResponse(
            requestId: requestId, artifacts: artifacts, requestStatus: requestStatus,
            version: version, type: type, extensionMembers: extras
        )
    }
}

public extension Artifact {
    func toJSON() -> JSONValue {
        switch self {
        case .fhirJson(let a):
            var o: [(key: String, value: JSONValue)] = []
            o.append(("id", .string(a.id)))
            o.append(("mediaType", .string(SmartHealthCheckinConstants.mediaTypeFhirJson)))
            o.append(("fhirVersion", .string(a.fhirVersion)))
            o.append(("fulfills", .array(a.fulfills.map { .string($0) })))
            o.append(("value", a.value))
            for em in a.extensionMembers { o.append((em.key, em.value)) }
            return .object(o)
        case .smartHealthCard(let a):
            var o: [(key: String, value: JSONValue)] = []
            o.append(("id", .string(a.id)))
            o.append(("mediaType", .string(SmartHealthCheckinConstants.mediaTypeSmartHealthCard)))
            o.append(("fulfills", .array(a.fulfills.map { .string($0) })))
            o.append(("value", .object([
                ("verifiableCredential", .array(a.verifiableCredentials.map { .string($0) }))
            ])))
            for em in a.extensionMembers { o.append((em.key, em.value)) }
            return .object(o)
        case .ext(let a):
            return .object(a.members)
        }
    }

    static func fromJSON(_ v: JSONValue, path: String) throws -> Artifact {
        guard let members = v.objectMembers else { throw ModelDecodeError.expectedObject(path: path) }
        var id: String?, mediaType: String?
        var fulfillsRaw: JSONValue?
        var others: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            switch k {
            case "id":        id = try requireNonEmptyString(vv, path: "\(path).id")
            case "mediaType": mediaType = try requireNonEmptyString(vv, path: "\(path).mediaType")
            case "fulfills":  fulfillsRaw = vv
            default:          others.append((k, vv))
            }
        }
        guard let id = id else { throw ModelDecodeError.missing(path: "\(path).id") }
        guard let mediaType = mediaType else { throw ModelDecodeError.missing(path: "\(path).mediaType") }
        guard let fulfillsRaw = fulfillsRaw else { throw ModelDecodeError.missing(path: "\(path).fulfills") }
        let fulfills = try requireStringArray(fulfillsRaw, path: "\(path).fulfills", allowEmpty: false)

        switch mediaType {
        case SmartHealthCheckinConstants.mediaTypeFhirJson:
            var fhirVersion: String?
            var value: JSONValue?
            var extras: [(key: String, value: JSONValue)] = []
            for (k, vv) in others {
                switch k {
                case "fhirVersion": fhirVersion = try requireNonEmptyString(vv, path: "\(path).fhirVersion")
                case "value":       value = vv
                default:            extras.append((k, vv))
                }
            }
            guard let fhirVersion = fhirVersion else { throw ModelDecodeError.missing(path: "\(path).fhirVersion") }
            guard let value = value else { throw ModelDecodeError.missing(path: "\(path).value") }
            // §6.1 raw FHIR Artifacts SHALL have FHIR object value (resourceType present).
            guard case .object(let vmems) = value, vmems.contains(where: { $0.key == "resourceType" }) else {
                throw ModelDecodeError.invalid(path: "\(path).value", reason: "expected FHIR Resource or Bundle (object with resourceType)")
            }
            return .fhirJson(.init(id: id, fulfills: fulfills, fhirVersion: fhirVersion, value: value, extensionMembers: extras))
        case SmartHealthCheckinConstants.mediaTypeSmartHealthCard:
            // §6.1 SMART Health Card Artifacts SHALL NOT carry outer fhirVersion.
            for (k, _) in others where k == "fhirVersion" {
                throw ModelDecodeError.invalid(path: "\(path).fhirVersion", reason: "MUST NOT be present on application/smart-health-card")
            }
            var value: JSONValue?
            var extras: [(key: String, value: JSONValue)] = []
            for (k, vv) in others {
                switch k {
                case "value": value = vv
                default:      extras.append((k, vv))
                }
            }
            guard let value = value else { throw ModelDecodeError.missing(path: "\(path).value") }
            guard let inner = value["verifiableCredential"] else {
                throw ModelDecodeError.missing(path: "\(path).value.verifiableCredential")
            }
            let vcs = try requireStringArray(inner, path: "\(path).value.verifiableCredential", allowEmpty: false)
            return .smartHealthCard(.init(id: id, fulfills: fulfills, verifiableCredentials: vcs, extensionMembers: extras))
        default:
            // Extension media type. Preserve full source object members so the
            // caller can apply a registered extension definition.
            var fullMembers: [(key: String, value: JSONValue)] = [
                ("id", .string(id)),
                ("mediaType", .string(mediaType)),
                ("fulfills", .array(fulfills.map { .string($0) }))
            ]
            for (k, vv) in others { fullMembers.append((k, vv)) }
            return .ext(.init(id: id, mediaType: mediaType, fulfills: fulfills, members: fullMembers))
        }
    }
}

public extension RequestItemStatus {
    func toJSON() -> JSONValue {
        var o: [(key: String, value: JSONValue)] = []
        o.append(("item", .string(item)))
        o.append(("status", .string(status.rawValue)))
        if let m = message { o.append(("message", .string(m))) }
        for em in extensionMembers { o.append((em.key, em.value)) }
        return .object(o)
    }

    static func fromJSON(_ v: JSONValue, path: String) throws -> RequestItemStatus {
        guard let members = v.objectMembers else { throw ModelDecodeError.expectedObject(path: path) }
        var item: String?, statusStr: String?, message: String?
        var extras: [(key: String, value: JSONValue)] = []
        for (k, vv) in members {
            switch k {
            case "item":    item = try requireNonEmptyString(vv, path: "\(path).item")
            case "status":  statusStr = try requireNonEmptyString(vv, path: "\(path).status")
            case "message": message = try requireString(vv, path: "\(path).message")
            default:        extras.append((k, vv))
            }
        }
        guard let item = item else { throw ModelDecodeError.missing(path: "\(path).item") }
        guard let statusStr = statusStr else { throw ModelDecodeError.missing(path: "\(path).status") }
        guard let code = Code(rawValue: statusStr) else {
            throw ModelDecodeError.invalid(path: "\(path).status", reason: "unknown status code '\(statusStr)' (expected one of fulfilled/partial/unavailable/declined/unsupported/error)")
        }
        return RequestItemStatus(item: item, status: code, message: message, extensionMembers: extras)
    }
}
