// SPDX-License-Identifier: MIT
//
// HPKE seal / open for the SMART Health Check-in same-device flow.
//
// Baseline algorithms (§8.4):
//   KEM:  DHKEM(P-256, HKDF-SHA256)   suite id 0x0010
//   KDF:  HKDF-SHA256                 suite id 0x0001
//   AEAD: AES-128-GCM                 suite id 0x0001
//   info: SessionTranscript bytes
//   AAD:  empty byte string
//   Mode: HPKE base mode (no PSK, no auth)

import Foundation
import Crypto
import SmartHealthCheckinCBOR

public enum CheckinHPKE {
    public static let baselineCiphersuite = HPKE.Ciphersuite(
        kem: .P256_HKDF_SHA256,
        kdf: .HKDF_SHA256,
        aead: .AES_GCM_128
    )

    /// Seal a plaintext for a recipient public key.
    /// Returns the HPKE encapsulated key (raw P-256 SEC1 point) and the AEAD ciphertext+tag.
    public static func seal(
        plaintext: Data,
        recipientPublicKey: P256.KeyAgreement.PublicKey,
        info: Data,
        aad: Data = Data()
    ) throws -> (enc: Data, ciphertext: Data) {
        var sender = try HPKE.Sender(
            recipientKey: recipientPublicKey,
            ciphersuite: baselineCiphersuite,
            info: info
        )
        let ct = try sender.seal(plaintext, authenticating: aad)
        return (sender.encapsulatedKey, ct)
    }

    /// Open a ciphertext using the retained recipient private key and the
    /// encapsulated key bytes from the wallet.
    public static func open(
        ciphertext: Data,
        encapsulatedKey: Data,
        recipientPrivateKey: P256.KeyAgreement.PrivateKey,
        info: Data,
        aad: Data = Data()
    ) throws -> Data {
        var recipient = try HPKE.Recipient(
            privateKey: recipientPrivateKey,
            ciphersuite: baselineCiphersuite,
            info: info,
            encapsulatedKey: encapsulatedKey
        )
        return try recipient.open(ciphertext, authenticating: aad)
    }
}

/// `dcapiResponse` envelope (§8.4):
///
///   dcapiResponse = CBOR(["dcapi", { "enc": <ephemeral pubkey raw>, "cipherText": <ct> }])
public enum DCAPIResponse {
    public static func encode(enc: Data, ciphertext: Data) -> Data {
        let cbor = CBOR.array([
            .textString("dcapi"),
            .map([
                .init(key: .textString("enc"),        value: .byteString(enc)),
                .init(key: .textString("cipherText"), value: .byteString(ciphertext)),
            ])
        ])
        return CBOREncoder.encode(cbor)
    }

    public static func decode(_ data: Data) throws -> (enc: Data, ciphertext: Data) {
        let v = try CBORDecoder.lenient.decode(data)
        guard case .array(let xs) = v, xs.count == 2,
              case .textString(let tag) = xs[0], tag == "dcapi",
              case .map(let entries) = xs[1] else {
            throw DCAPIResponseError.malformed
        }
        var enc: Data?, ct: Data?
        for e in entries {
            if case .textString(let k) = e.key {
                if k == "enc", case .byteString(let d) = e.value { enc = d }
                if k == "cipherText", case .byteString(let d) = e.value { ct = d }
            }
        }
        guard let enc = enc, let ct = ct else { throw DCAPIResponseError.malformed }
        return (enc, ct)
    }
}

public enum DCAPIResponseError: Error, Equatable, Sendable {
    case malformed
}

/// `encryptionInfo` envelope (§8.2):
///
///   encryptionInfo = CBOR(["dcapi", { "nonce": bstr, "recipientPublicKey": COSE_Key }])
public enum EncryptionInfo {
    public static func encode(nonce: Data, recipientPublicKey: P256.KeyAgreement.PublicKey) -> Data {
        let cose = COSEKey.encodeP256(publicKey: recipientPublicKey)
        let cbor = CBOR.array([
            .textString("dcapi"),
            .map([
                .init(key: .textString("nonce"),              value: .byteString(nonce)),
                .init(key: .textString("recipientPublicKey"), value: cose),
            ])
        ])
        return CBOREncoder.encode(cbor)
    }

    public static func decode(_ data: Data) throws -> (nonce: Data, recipientPublicKey: P256.KeyAgreement.PublicKey) {
        let v = try CBORDecoder.lenient.decode(data)
        guard case .array(let xs) = v, xs.count == 2,
              case .textString(let tag) = xs[0], tag == "dcapi",
              case .map(let entries) = xs[1] else {
            throw EncryptionInfoError.malformed
        }
        var nonce: Data?
        var coseKey: CBOR?
        for e in entries {
            if case .textString(let k) = e.key {
                if k == "nonce", case .byteString(let d) = e.value { nonce = d }
                if k == "recipientPublicKey" { coseKey = e.value }
            }
        }
        guard let nonce = nonce, let coseKey = coseKey else { throw EncryptionInfoError.malformed }
        let parsed = try COSEKey.decodeP256(coseKey)
        let pub = try parsed.asKeyAgreementKey()
        return (nonce, pub)
    }
}

public enum EncryptionInfoError: Error, Equatable, Sendable {
    case malformed
}
