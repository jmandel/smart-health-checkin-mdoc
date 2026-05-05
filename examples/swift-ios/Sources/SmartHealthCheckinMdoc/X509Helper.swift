// SPDX-License-Identifier: MIT
//
// Tiny helper that extracts a P-256 public key out of an X.509 certificate
// (DER-encoded). Used to derive the issuer signing key from the leaf cert in
// COSE header 33 (`x5chain`) when the application has not pre-supplied a
// trusted issuer key list.

import Foundation
import Crypto
import X509

public enum X509Helper {
    public static func p256PublicKey(fromCertificate der: Data) -> P256.Signing.PublicKey? {
        guard let cert = try? Certificate(derEncoded: Array(der)) else { return nil }
        return P256.Signing.PublicKey(cert.publicKey)
    }
}
