// SPDX-License-Identifier: MIT
//
// DeviceRequest: the verifier→wallet message.
//
//   DeviceRequest = {
//     "version":     "1.0",
//     "docRequests": [DocRequest, ...]
//   }
//
//   DocRequest = {
//     "itemsRequest": Tag(24, bstr .cbor ItemsRequest),
//     ? "readerAuth": COSE_Sign1                       (detached payload)
//   }
//
//   ItemsRequest = {
//     "docType":     "org.smarthealthit.checkin.1",
//     "nameSpaces":  { "org.smarthealthit.checkin": { "smart_health_checkin_response": intentToRetain } },
//     ? "requestInfo": { "org.smarthealthit.checkin.request": <SMART JSON UTF-8 text> }
//   }
//
// The SMART JSON sits as a CBOR text string (NOT a map, NOT base64url) per
// §8.2 — that's load-bearing.

import Foundation
import SmartHealthCheckinCBOR

public struct CheckinDocRequest: Sendable, Equatable {
    /// The exact tag-24 wrapper bytes for the ItemsRequest, as on the wire.
    /// PRESERVE these — the verifier's optional `readerAuth` signs over them.
    public var itemsRequestTag24Bytes: Data
    /// The decoded ItemsRequest, for ergonomic access.
    public var itemsRequest: CheckinItemsRequest
    /// Optional reader authentication (detached COSE_Sign1).
    public var readerAuth: COSESign1?

    public init(itemsRequestTag24Bytes: Data, itemsRequest: CheckinItemsRequest, readerAuth: COSESign1? = nil) {
        self.itemsRequestTag24Bytes = itemsRequestTag24Bytes
        self.itemsRequest = itemsRequest
        self.readerAuth = readerAuth
    }
}

public struct CheckinItemsRequest: Sendable, Equatable {
    /// Should be `org.smarthealthit.checkin.1` for the SMART Health Check-in flow.
    public var docType: String
    /// Element-name → intentToRetain map for the SMART namespace.
    public var elementsByNamespace: [(namespace: String, elements: [(element: String, intentToRetain: Bool)])]
    /// requestInfo[<requestCarrierKey>] = SMART request JSON (UTF-8 text string).
    public var requestInfo: [(key: String, value: CBOR)]

    public init(
        docType: String,
        elementsByNamespace: [(namespace: String, elements: [(element: String, intentToRetain: Bool)])],
        requestInfo: [(key: String, value: CBOR)]
    ) {
        self.docType = docType
        self.elementsByNamespace = elementsByNamespace
        self.requestInfo = requestInfo
    }

    public static func == (lhs: CheckinItemsRequest, rhs: CheckinItemsRequest) -> Bool {
        guard lhs.docType == rhs.docType else { return false }
        guard lhs.elementsByNamespace.count == rhs.elementsByNamespace.count else { return false }
        for (i, ns) in lhs.elementsByNamespace.enumerated() {
            let other = rhs.elementsByNamespace[i]
            if ns.namespace != other.namespace || ns.elements.count != other.elements.count { return false }
            for (j, e) in ns.elements.enumerated() {
                if e.element != other.elements[j].element || e.intentToRetain != other.elements[j].intentToRetain {
                    return false
                }
            }
        }
        guard lhs.requestInfo.count == rhs.requestInfo.count else { return false }
        for (i, p) in lhs.requestInfo.enumerated() {
            if p.key != rhs.requestInfo[i].key || p.value != rhs.requestInfo[i].value { return false }
        }
        return true
    }

    /// Convenience: the SMART request JSON as raw bytes, if present at the
    /// canonical request carrier key.
    public func smartRequestJSON(carrierKey: String) -> Data? {
        for (k, v) in requestInfo where k == carrierKey {
            if case .textString(let s) = v { return Data(s.utf8) }
            // §8.4 explicitly rejects non-text-string carriers.
            return nil
        }
        return nil
    }
}

public struct CheckinDeviceRequest: Sendable, Equatable {
    public var version: String
    public var docRequests: [CheckinDocRequest]

    public init(version: String = "1.0", docRequests: [CheckinDocRequest]) {
        self.version = version
        self.docRequests = docRequests
    }
}

// MARK: - Builders

public enum DeviceRequestBuilder {

    public struct Options {
        public var docType: String
        public var namespace: String
        public var element: String
        public var requestCarrierKey: String
        public var intentToRetain: Bool
        public init(
            docType: String,
            namespace: String,
            element: String,
            requestCarrierKey: String,
            intentToRetain: Bool = true
        ) {
            self.docType = docType; self.namespace = namespace; self.element = element
            self.requestCarrierKey = requestCarrierKey; self.intentToRetain = intentToRetain
        }
    }

    /// Build a `DeviceRequest` carrying the SMART request JSON. Returns the
    /// CBOR bytes (not yet base64url-encoded) and the tag-24 wrapper bytes for
    /// the ItemsRequest (so the caller can hand them to a `readerAuth` signer
    /// before encoding).
    public static func build(
        smartRequestJSON: Data,
        options: Options,
        readerAuth: COSESign1? = nil
    ) -> (deviceRequestBytes: Data, itemsRequestTag24Bytes: Data) {
        // Build ItemsRequest CBOR map.
        let nameSpaces = CBOR.map([
            .init(key: .textString(options.namespace),
                  value: .map([
                    .init(key: .textString(options.element), value: .bool(options.intentToRetain))
                  ]))
        ])
        let requestInfo = CBOR.map([
            .init(key: .textString(options.requestCarrierKey),
                  value: .textString(String(decoding: smartRequestJSON, as: UTF8.self)))
        ])
        let itemsRequest = CBOR.map([
            .init(key: .textString("docType"),     value: .textString(options.docType)),
            .init(key: .textString("nameSpaces"),  value: nameSpaces),
            .init(key: .textString("requestInfo"), value: requestInfo),
        ])
        let itemsRequestBytes = CBOREncoder.encode(itemsRequest)
        let tag24 = CBOR.tag24Bytes(itemsRequestBytes)
        let tag24Bytes = CBOREncoder.encode(tag24)

        var docRequestEntries: [CBORMapEntry] = [
            .init(key: .textString("itemsRequest"), value: tag24)
        ]
        if let readerAuth = readerAuth {
            docRequestEntries.append(.init(key: .textString("readerAuth"), value: readerAuth.asCBOR()))
        }

        let deviceRequest = CBOR.map([
            .init(key: .textString("version"),     value: .textString("1.0")),
            .init(key: .textString("docRequests"), value: .array([.map(docRequestEntries)])),
        ])
        return (CBOREncoder.encode(deviceRequest), tag24Bytes)
    }
}

// MARK: - Parser

public enum DeviceRequestParser {
    public enum Error: Swift.Error, Equatable, Sendable {
        case malformedDeviceRequest
        case unsupportedDeviceRequestVersion(String)
        case malformedDocRequest
        case malformedItemsRequest
        case missingItemsRequestField(String)
        case nonTextRequestCarrier
        case docTypeMismatch(expected: String, actual: String)
        case namespaceMismatch(expected: String)
        case elementMismatch(expected: String)
    }

    /// Parse a DeviceRequest's CBOR bytes. Validates structure but does NOT
    /// validate any embedded SMART JSON (do that at the next layer).
    public static func parse(_ data: Data, expecting options: DeviceRequestBuilder.Options) throws -> CheckinDeviceRequest {
        let decoded = try CBORDecoder.lenient.decodeWithSlices(data)
        guard case .map(let entries) = decoded.value else { throw Error.malformedDeviceRequest }
        var version: String?
        var docRequestsRaw: [CBOR]?
        for e in entries {
            guard case .textString(let key) = e.key else { continue }
            switch key {
            case "version":
                if case .textString(let s) = e.value { version = s }
            case "docRequests":
                if case .array(let xs) = e.value { docRequestsRaw = xs }
            default: break
            }
        }
        guard let version = version else { throw Error.malformedDeviceRequest }
        guard version == "1.0" else { throw Error.unsupportedDeviceRequestVersion(version) }
        guard let docRequestsRaw = docRequestsRaw, !docRequestsRaw.isEmpty else {
            throw Error.malformedDeviceRequest
        }

        // Find each docRequests[i].itemsRequest tag-24 wrapper; we need its
        // exact bytes to compute readerAuth's detached payload (and to keep
        // the verifier's commitment to those bytes if it later signs them).
        var docs: [CheckinDocRequest] = []
        for (i, dr) in docRequestsRaw.enumerated() {
            guard case .map(let drEntries) = dr else { throw Error.malformedDocRequest }
            var itemsTag24: CBOR?
            var readerAuthVal: CBOR?
            for e in drEntries {
                guard case .textString(let key) = e.key else { continue }
                switch key {
                case "itemsRequest": itemsTag24 = e.value
                case "readerAuth":   readerAuthVal = e.value
                default: break
                }
            }
            guard let itemsTag24 = itemsTag24,
                  case let .tagged(24, .byteString(itemsBytes)) = itemsTag24 else {
                throw Error.malformedDocRequest
            }
            let itemsRequest = try parseItemsRequest(itemsBytes, expecting: options)
            // The exact tag-24 wrapper bytes from the source — used by the
            // wallet/verifier when validating readerAuth.
            let tag24SrcSlice = try decoded.slice(at: [
                .key(.textString("docRequests")),
                .index(i),
                .key(.textString("itemsRequest")),
            ]).source

            let readerAuth: COSESign1? = try readerAuthVal.map { try COSESign1.from($0) }
            docs.append(.init(itemsRequestTag24Bytes: tag24SrcSlice, itemsRequest: itemsRequest, readerAuth: readerAuth))
        }
        return CheckinDeviceRequest(version: version, docRequests: docs)
    }

    static func parseItemsRequest(_ data: Data, expecting options: DeviceRequestBuilder.Options) throws -> CheckinItemsRequest {
        let v = try CBORDecoder.lenient.decode(data)
        guard case .map(let entries) = v else { throw Error.malformedItemsRequest }
        var docType: String?
        var nameSpaces: CBOR?
        var requestInfoRaw: CBOR?
        for e in entries {
            guard case .textString(let k) = e.key else { continue }
            switch k {
            case "docType":     if case .textString(let s) = e.value { docType = s }
            case "nameSpaces":  nameSpaces = e.value
            case "requestInfo": requestInfoRaw = e.value
            default: break
            }
        }
        guard let docType = docType else { throw Error.missingItemsRequestField("docType") }
        guard docType == options.docType else {
            throw Error.docTypeMismatch(expected: options.docType, actual: docType)
        }
        guard let nameSpaces = nameSpaces else { throw Error.missingItemsRequestField("nameSpaces") }
        // Build elementsByNamespace ensuring we see the expected SMART namespace+element.
        guard case .map(let nsEntries) = nameSpaces else { throw Error.malformedItemsRequest }
        var found = false
        var allNs: [(namespace: String, elements: [(element: String, intentToRetain: Bool)])] = []
        for e in nsEntries {
            guard case .textString(let nsName) = e.key else { continue }
            guard case .map(let elements) = e.value else { throw Error.malformedItemsRequest }
            var elList: [(element: String, intentToRetain: Bool)] = []
            for el in elements {
                guard case .textString(let elName) = el.key else { continue }
                let retain: Bool
                if case .bool(let b) = el.value { retain = b } else { throw Error.malformedItemsRequest }
                elList.append((elName, retain))
                if nsName == options.namespace && elName == options.element { found = true }
            }
            allNs.append((nsName, elList))
        }
        if !found {
            throw Error.elementMismatch(expected: "\(options.namespace).\(options.element)")
        }

        var requestInfo: [(key: String, value: CBOR)] = []
        if let requestInfoRaw = requestInfoRaw {
            guard case .map(let riEntries) = requestInfoRaw else { throw Error.malformedItemsRequest }
            for e in riEntries {
                guard case .textString(let k) = e.key else { continue }
                if k == options.requestCarrierKey, case .textString = e.value {
                    requestInfo.append((k, e.value))
                } else if k == options.requestCarrierKey {
                    // §8.4: the SMART request carrier MUST be a CBOR text string.
                    throw Error.nonTextRequestCarrier
                } else {
                    requestInfo.append((k, e.value))
                }
            }
        }
        return CheckinItemsRequest(docType: docType, elementsByNamespace: allNs, requestInfo: requestInfo)
    }
}

// MARK: - ReaderAuth helpers

public enum ReaderAuth {
    /// Reconstruct the detached `ReaderAuthentication` payload bytes that the
    /// verifier signs. These bytes are NOT carried inline in the COSE_Sign1
    /// payload field — the COSE payload MUST be `nil` for `readerAuth`.
    ///
    ///   ReaderAuthentication = ["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]
    ///   ReaderAuthenticationBytes = Tag(24, bstr .cbor ReaderAuthentication)
    public static func readerAuthenticationBytes(
        sessionTranscript: Data,
        itemsRequestTag24Bytes: Data
    ) -> Data {
        let inner = RawCBORBuilder.arrayBytes([
            RawCBORBuilder.textString("ReaderAuthentication"),
            sessionTranscript,        // already CBOR-encoded
            itemsRequestTag24Bytes,   // already CBOR-encoded (Tag(24, bstr ...))
        ])
        return RawCBORBuilder.tag24(inner: inner)
    }
}
