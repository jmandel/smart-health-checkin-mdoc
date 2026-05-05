// SPDX-License-Identifier: MIT
//
// COSE_Sign1 (RFC 9052 §4.4) for ES256, attached or detached payload, no
// external_aad. This is what the SMART Health Check-in same-device flow uses
// for `issuerAuth`, `deviceSignature`, and (optional) `readerAuth`.
//
//   COSE_Sign1 = [
//     protected:    bstr,                     -- canonical CBOR encoding of the
//                                                protected-header map; signed bytes.
//     unprotected:  { ... },                  -- not signed.
//     payload:      bstr / nil,               -- bstr = attached, nil = detached.
//     signature:    bstr                      -- 64-byte raw R||S for ES256.
//   ]
//
// Sig_structure for ES256:
//   ToBeSigned = ["Signature1", protected, h'', payloadBytes]
//   sig = ECDSA_SHA256(privKey, ToBeSigned)  -> raw R||S, 64 bytes
//
// `payloadBytes` is the SAME bytes for both attached and detached signatures —
// the only difference is whether those bytes also appear inline in the COSE
// payload field on the wire.

import Foundation
import Crypto
import SmartHealthCheckinCBOR

public struct COSESign1: Equatable, Sendable {
    /// Raw bytes of the COSE protected-header bstr (CBOR-encoded protected map).
    /// PRESERVE these bytes exactly — the verifier signs them, not a re-encoded
    /// version. (Empty map encoding `0xa0` should appear as a one-byte bstr
    /// 0x40 in the wire COSE structure, not as bstr containing zero bytes.
    /// We follow RFC 9052: the empty protected map is encoded as `bstr h''`.
    public var protectedBytes: Data
    public var unprotected: [CBORMapEntry]
    /// `nil` means detached payload; the verifier provides the payload externally.
    public var payload: Data?
    /// 64-byte raw ECDSA P-256 signature (R(32) || S(32)).
    public var signature: Data

    public init(protectedBytes: Data, unprotected: [CBORMapEntry] = [], payload: Data?, signature: Data) {
        self.protectedBytes = protectedBytes
        self.unprotected = unprotected
        self.payload = payload
        self.signature = signature
    }

    /// COSE_Sign1 wire form as a 4-element array.
    public func asCBOR() -> CBOR {
        return .array([
            .byteString(protectedBytes),
            .map(unprotected),
            payload.map(CBOR.byteString) ?? .null,
            .byteString(signature),
        ])
    }

    /// Tag-18 wrapped COSE_Sign1 (RFC 9052 cbor tag for cose-sign1). mdoc
    /// `issuerAuth` is conventionally untagged inside the `IssuerSigned` map;
    /// we leave tagging up to the caller.
    public func asTagged() -> CBOR {
        return .tagged(18, asCBOR())
    }

    public static func from(_ cbor: CBOR) throws -> COSESign1 {
        var c = cbor
        if case let .tagged(tag, inner) = cbor, tag == 18 { c = inner }
        guard case .array(let xs) = c, xs.count == 4 else {
            throw COSESign1Error.malformed
        }
        guard case .byteString(let prot) = xs[0] else { throw COSESign1Error.malformed }
        let unprotected: [CBORMapEntry]
        if case .map(let m) = xs[1] { unprotected = m }
        else { throw COSESign1Error.malformed }
        let payload: Data?
        switch xs[2] {
        case .null: payload = nil
        case .byteString(let d): payload = d
        default: throw COSESign1Error.malformed
        }
        guard case .byteString(let sig) = xs[3] else { throw COSESign1Error.malformed }
        return COSESign1(protectedBytes: prot, unprotected: unprotected, payload: payload, signature: sig)
    }
}

public enum COSESign1Error: Error, Equatable, Sendable {
    case malformed
    case unsupportedAlgorithm(Int64)
    case algorithmNotES256
    case missingDetachedPayload
    case signatureMismatch
}

public enum COSESign1Signer {
    /// Build the canonical protected-header bytes for an ES256 signature.
    /// Optional COSE header parameters can be provided in `additional` and will
    /// be merged into the protected map (use sparingly — most labels belong in
    /// unprotected).
    public static func es256ProtectedHeader(additional: [CBORMapEntry] = []) -> Data {
        var entries: [CBORMapEntry] = [.init(key: .int(1), value: .int(-7))]
        for e in additional { entries.append(e) }
        return CBOREncoder.encode(.map(entries))
    }

    /// Sign-and-build a COSE_Sign1 over `payload` with the given P-256 signing key.
    /// `attached` controls whether the payload bytes appear inline or are detached.
    public static func sign(
        payload: Data,
        attached: Bool,
        privateKey: P256.Signing.PrivateKey,
        protectedBytes: Data,
        unprotected: [CBORMapEntry] = []
    ) throws -> COSESign1 {
        let toBeSigned = sigStructure(protectedBytes: protectedBytes, payload: payload)
        let sig = try privateKey.signature(for: toBeSigned)
        return COSESign1(
            protectedBytes: protectedBytes,
            unprotected: unprotected,
            payload: attached ? payload : nil,
            signature: sig.rawRepresentation
        )
    }

    /// Verify a COSE_Sign1 with the given P-256 public key.
    /// For attached signatures pass `detachedPayload: nil`; for detached, pass
    /// the externally-known payload bytes. (Both modes hash the same bytes.)
    public static func verify(
        _ sign1: COSESign1,
        publicKey: P256.Signing.PublicKey,
        detachedPayload: Data? = nil
    ) throws {
        // Verify the protected header advertises ES256.
        try requireES256(in: sign1.protectedBytes)

        let payloadBytes: Data
        switch (sign1.payload, detachedPayload) {
        case (.some(let attached), .none):
            payloadBytes = attached
        case (.some(let attached), .some(let provided)):
            // Both are present: they MUST agree.
            guard attached == provided else { throw COSESign1Error.signatureMismatch }
            payloadBytes = attached
        case (.none, .some(let provided)):
            payloadBytes = provided
        case (.none, .none):
            throw COSESign1Error.missingDetachedPayload
        }

        let toBeSigned = sigStructure(protectedBytes: sign1.protectedBytes, payload: payloadBytes)
        guard sign1.signature.count == 64 else { throw COSESign1Error.signatureMismatch }
        let parsed: P256.Signing.ECDSASignature
        do {
            parsed = try P256.Signing.ECDSASignature(rawRepresentation: sign1.signature)
        } catch {
            throw COSESign1Error.signatureMismatch
        }
        if !publicKey.isValidSignature(parsed, for: toBeSigned) {
            throw COSESign1Error.signatureMismatch
        }
    }

    /// `Sig_structure = ["Signature1", protected, h'', payload]`.
    public static func sigStructure(protectedBytes: Data, payload: Data) -> Data {
        let arr = CBOR.array([
            .textString("Signature1"),
            .byteString(protectedBytes),
            .byteString(Data()),
            .byteString(payload),
        ])
        return CBOREncoder.encode(arr)
    }

    static func requireES256(in protectedBytes: Data) throws {
        if protectedBytes.isEmpty { throw COSESign1Error.algorithmNotES256 }
        let header: CBOR
        do { header = try CBORDecoder.lenient.decode(protectedBytes) } catch {
            throw COSESign1Error.algorithmNotES256
        }
        guard case .map(let entries) = header else { throw COSESign1Error.algorithmNotES256 }
        for e in entries {
            if case .unsigned(1) = e.key {
                if case .negative(let n) = e.value, n == 6 { return } // -7 = ES256
                if case .negative(let n) = e.value {
                    throw COSESign1Error.unsupportedAlgorithm(-1 - Int64(n))
                }
                if case .unsigned(let n) = e.value {
                    throw COSESign1Error.unsupportedAlgorithm(Int64(n))
                }
            }
        }
        throw COSESign1Error.algorithmNotES256
    }
}
