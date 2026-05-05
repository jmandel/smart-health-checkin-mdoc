// SPDX-License-Identifier: MIT
//
// Helpers for assembling CBOR bytes from already-encoded child items, without
// going through the structured `CBOR` value type. The mdoc same-device flow
// has a few places where this matters: `DeviceAuthentication` and
// `ReaderAuthentication` both embed an already-CBOR-encoded `SessionTranscript`
// and `ItemsRequestBytes` directly. Re-encoding those is a digest/signature
// hazard, so we splice the bytes in verbatim.

import Foundation

public enum RawCBORBuilder {
    /// Build a CBOR array whose children are already encoded.
    public static func arrayBytes(_ items: [Data]) -> Data {
        var out = Data()
        CBOREncoder.writeHead(major: 4, argument: UInt64(items.count), to: &out)
        for it in items { out.append(it) }
        return out
    }

    /// `Tag(24, bstr <inner>)` from already-encoded inner bytes.
    public static func tag24(inner: Data) -> Data {
        var out = Data()
        CBOREncoder.writeHead(major: 6, argument: 24, to: &out)
        CBOREncoder.writeHead(major: 2, argument: UInt64(inner.count), to: &out)
        out.append(inner)
        return out
    }

    /// Encode a single CBOR text string to bytes.
    public static func textString(_ s: String) -> Data {
        var out = Data()
        let utf8 = Data(s.utf8)
        CBOREncoder.writeHead(major: 3, argument: UInt64(utf8.count), to: &out)
        out.append(utf8)
        return out
    }

    /// Encode a single CBOR byte string to bytes.
    public static func byteString(_ d: Data) -> Data {
        var out = Data()
        CBOREncoder.writeHead(major: 2, argument: UInt64(d.count), to: &out)
        out.append(d)
        return out
    }
}
