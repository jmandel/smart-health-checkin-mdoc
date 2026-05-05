// SPDX-License-Identifier: MIT
//
// Stable identifiers and constants from SMART Health Check-in 1.0 §4 / §8.1.
// These are fixed protocol values; profiles do not redefine them.

import Foundation

public enum SmartHealthCheckinConstants {
    /// Request discriminator. Verifier sets `type` to this exact value.
    public static let requestType = "smart-health-checkin-request"
    /// Response discriminator. Wallet sets `type` to this exact value.
    public static let responseType = "smart-health-checkin-response"
    /// Current request/response model version.
    public static let modelVersion = "1"

    /// W3C DC API protocol identifier used by §8 same-device flow.
    public static let dcApiProtocol = "org-iso-mdoc"
    /// mdoc docType for SMART Health Check-in.
    public static let mdocDocType = "org.smarthealthit.checkin.1"
    /// mdoc namespace.
    public static let mdocNamespace = "org.smarthealthit.checkin"
    /// Stable mdoc element identifier carrying the SMART response JSON.
    public static let mdocElementIdentifier = "smart_health_checkin_response"
    /// Key under `ItemsRequest.requestInfo` carrying the SMART request JSON
    /// (as a CBOR text string, NOT a map and NOT base64url JSON, per §8.2).
    public static let mdocRequestCarrierKey = "org.smarthealthit.checkin.request"

    /// Core selector kinds.
    public static let selectorKindSelectionFhir = "selection.fhir"
    public static let selectorKindFormFhir = "form.fhir"

    /// Core Artifact media types.
    public static let mediaTypeFhirJson = "application/fhir+json"
    public static let mediaTypeSmartHealthCard = "application/smart-health-card"
}
