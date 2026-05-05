// SPDX-License-Identifier: MIT
//
// §5 request structural validation and §6.4 verifier cross-validation.
//
// Structural validation here goes beyond what `parse` checks (which is mostly
// shape and required-member presence). These are issues a wallet/responder
// or verifier would otherwise have to spot themselves.

import Foundation

public struct ValidationIssue: Equatable, Sendable, CustomStringConvertible {
    public enum Severity: String, Sendable, Equatable {
        case error
        case warning
    }
    public var severity: Severity
    public var path: String
    public var message: String

    public init(severity: Severity, path: String, message: String) {
        self.severity = severity; self.path = path; self.message = message
    }

    public var description: String { "\(severity.rawValue.uppercased()) \(path): \(message)" }
}

public struct ValidationReport: Equatable, Sendable, CustomStringConvertible {
    public var issues: [ValidationIssue]
    public init(issues: [ValidationIssue] = []) { self.issues = issues }

    public var hasErrors: Bool { issues.contains { $0.severity == .error } }
    public var errors: [ValidationIssue] { issues.filter { $0.severity == .error } }
    public var warnings: [ValidationIssue] { issues.filter { $0.severity == .warning } }

    public mutating func error(_ path: String, _ message: String) {
        issues.append(.init(severity: .error, path: path, message: message))
    }
    public mutating func warning(_ path: String, _ message: String) {
        issues.append(.init(severity: .warning, path: path, message: message))
    }

    public var description: String { issues.map(\.description).joined(separator: "\n") }
}

public enum SmartHealthCheckinValidator {

    /// Run §5 request validation. Returns a report with any issues found.
    /// Errors in this report mean the request is non-conformant; warnings flag
    /// likely-but-not-required problems.
    public static func validate(request: SmartHealthCheckinRequest) -> ValidationReport {
        var r = ValidationReport()
        if request.type != SmartHealthCheckinConstants.requestType {
            r.error("$.type", "must be exactly '\(SmartHealthCheckinConstants.requestType)'")
        }
        if request.version != SmartHealthCheckinConstants.modelVersion {
            r.error("$.version", "must be exactly '\(SmartHealthCheckinConstants.modelVersion)'")
        }
        if request.id.isEmpty { r.error("$.id", "must be non-empty") }

        // Items
        var ids = Set<String>()
        for (i, item) in request.items.enumerated() {
            let p = "$.items[\(i)]"
            if item.id.isEmpty { r.error("\(p).id", "must be non-empty") }
            if !ids.insert(item.id).inserted {
                r.error("\(p).id", "duplicate item id '\(item.id)'")
            }
            if item.title.isEmpty { r.error("\(p).title", "must be non-empty") }
            if item.accept.isEmpty { r.error("\(p).accept", "must be non-empty array") }

            switch item.content {
            case .selectionFhir(let s):
                if let p2 = s.profiles, p2.isEmpty { r.error("\(p).content.profiles", "must be non-empty if present") }
                if let pf = s.profilesFrom, pf.isEmpty { r.error("\(p).content.profilesFrom", "must be non-empty if present") }
                if let rt = s.resourceTypes, rt.isEmpty { r.error("\(p).content.resourceTypes", "must be non-empty if present") }
            case .formFhir(let f):
                if f.questionnaireCanonical == nil && f.questionnaire == nil {
                    r.error("\(p).content", "form.fhir requires questionnaireCanonical or questionnaire")
                }
                if let qc = f.questionnaireCanonical, qc.isEmpty {
                    r.error("\(p).content.questionnaireCanonical", "must be non-empty if present")
                }
                if let q = f.questionnaire {
                    if let resourceType = q["resourceType"]?.stringValue {
                        if resourceType != "Questionnaire" {
                            r.error("\(p).content.questionnaire.resourceType", "must be 'Questionnaire'")
                        }
                    } else {
                        r.error("\(p).content.questionnaire.resourceType", "must be 'Questionnaire'")
                    }
                }
            case .ext:
                r.warning("\(p).content.kind", "extension selector kind; receiver must implement it explicitly")
            }
        }
        return r
    }

    /// §6.4 Verifier cross-validation. Validates the SMART response JSON
    /// against the SMART request that produced it. Run AFTER parsing both
    /// (which has already enforced §6.1 shape rules and rejected duplicate
    /// JSON members).
    public static func crossValidate(
        request: SmartHealthCheckinRequest,
        response: SmartHealthCheckinResponse
    ) -> ValidationReport {
        var r = ValidationReport()

        // type / version / requestId
        if response.type != SmartHealthCheckinConstants.responseType {
            r.error("$.type", "must be exactly '\(SmartHealthCheckinConstants.responseType)'")
        }
        if response.version != SmartHealthCheckinConstants.modelVersion {
            r.error("$.version", "must be exactly '\(SmartHealthCheckinConstants.modelVersion)'")
        }
        if response.requestId != request.id {
            r.error("$.requestId", "must equal request id (got '\(response.requestId)', expected '\(request.id)')")
        }

        // Build accept-set per item id
        var acceptByItem: [String: [String]] = [:]
        var validItemIds = Set<String>()
        for item in request.items {
            acceptByItem[item.id] = item.accept
            validItemIds.insert(item.id)
        }

        // Artifact constraints
        var artifactIds = Set<String>()
        for (i, art) in response.artifacts.enumerated() {
            let p = "$.artifacts[\(i)]"
            if art.id.isEmpty {
                r.error("\(p).id", "must be non-empty")
            } else if !artifactIds.insert(art.id).inserted {
                r.error("\(p).id", "duplicate artifact id '\(art.id)'")
            }
            if art.fulfills.isEmpty {
                r.error("\(p).fulfills", "must be non-empty")
            }
            // case-sensitive media type comparison
            for (j, fid) in art.fulfills.enumerated() {
                guard validItemIds.contains(fid) else {
                    r.error("\(p).fulfills[\(j)]", "no request item with id '\(fid)'")
                    continue
                }
                if let accept = acceptByItem[fid], !accept.contains(art.mediaType) {
                    r.error("\(p).mediaType", "'\(art.mediaType)' is not in accept[] for item '\(fid)'")
                }
            }
            switch art {
            case .fhirJson(let a):
                if a.fhirVersion.isEmpty {
                    r.error("\(p).fhirVersion", "must be non-empty for application/fhir+json")
                }
                // Bundles must not mix FHIR releases — best-effort: a Bundle's
                // entries don't carry fhirVersion themselves, but if any
                // resource has meta.versionId vs the wrapper, that's a
                // deployment concern. Here we only flag obvious issues.
                if a.value["resourceType"]?.stringValue == nil {
                    r.error("\(p).value.resourceType", "must be a non-empty string")
                }
            case .smartHealthCard(let a):
                if a.verifiableCredentials.isEmpty {
                    r.error("\(p).value.verifiableCredential", "must contain at least one entry")
                }
            case .ext:
                r.warning("\(p).mediaType", "non-core media type; receiver must implement an explicit extension to consume it")
            }
        }

        // requestStatus must cover every item exactly once, no duplicates, no unknown ids.
        var seenStatusItems = Set<String>()
        for (i, st) in response.requestStatus.enumerated() {
            let p = "$.requestStatus[\(i)]"
            if !validItemIds.contains(st.item) {
                r.error("\(p).item", "no request item with id '\(st.item)'")
            }
            if !seenStatusItems.insert(st.item).inserted {
                r.error("\(p).item", "duplicate status entry for item '\(st.item)'")
            }
        }
        for itemId in validItemIds where !seenStatusItems.contains(itemId) {
            r.error("$.requestStatus", "missing entry for request item '\(itemId)'")
        }

        // §6.2 advisory: fulfilled / partial SHOULD be backed by an artifact.
        let artifactsByItem: [String: [Artifact]] = response.artifacts.reduce(into: [:]) { acc, a in
            for f in a.fulfills { acc[f, default: []].append(a) }
        }
        for st in response.requestStatus {
            if (st.status == .fulfilled || st.status == .partial) && (artifactsByItem[st.item]?.isEmpty ?? true) {
                r.warning("$.requestStatus", "item '\(st.item)' is \(st.status.rawValue) but no artifact fulfills it")
            }
        }
        return r
    }
}
