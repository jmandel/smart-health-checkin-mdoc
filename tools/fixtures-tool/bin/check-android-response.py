#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import cbor2
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fixtures_tool.checkin import expected_walk, parse_document, sha256_hex
from fixtures_tool.constants import DOCTYPE, ELEMENT, NAMESPACE


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate Android-generated SMART Check-in DeviceResponse bytes."
    )
    parser.add_argument("generated_dir", type=Path, help="Android generated response fixture directory.")
    parser.add_argument("--out", type=Path, help="Optional JSON check summary output.")
    args = parser.parse_args()

    summary = check_generated_dir(args.generated_dir)
    text = json.dumps(summary, indent=2, sort_keys=True) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)
    else:
        print(text, end="")


def check_generated_dir(generated_dir: Path) -> dict[str, Any]:
    project_dir = Path(__file__).resolve().parents[3]
    document_path = generated_dir / "device-response.cbor"
    expected_smart_path = generated_dir / "smart-response.expected.json"
    metadata = json.loads((generated_dir / "metadata.json").read_text())
    request_fixture_dir = project_dir / metadata["sourceRequestFixture"]
    expected_session_transcript = bytes.fromhex(
        json.loads((request_fixture_dir / "inspection.json").read_text())["sessionTranscript"]["hex"]
    )
    document_bytes = document_path.read_bytes()
    expected_smart = json.loads(expected_smart_path.read_text())
    parsed = parse_document(document_bytes)

    require(parsed.doc_type == DOCTYPE, f"docType mismatch: {parsed.doc_type}")
    require(parsed.namespace == NAMESPACE, f"namespace mismatch: {parsed.namespace}")
    require(parsed.element_identifier == ELEMENT, f"element mismatch: {parsed.element_identifier}")
    require(parsed.digest_matches, "MSO valueDigest does not match SHA-256(tag24(IssuerSignedItem))")
    require(parsed.smart_response == expected_smart, "SMART response JSON does not match expected fixture")

    document = cbor2.loads(document_bytes)
    doc = document["documents"][0]
    issuer_auth = doc["issuerSigned"]["issuerAuth"]
    protected = cbor2.loads(issuer_auth[0])
    require(protected.get(1) == -7, "issuerAuth protected alg must be ES256 (-7)")
    mso_tag = cbor2.loads(issuer_auth[2])
    require(isinstance(mso_tag, cbor2.CBORTag) and mso_tag.tag == 24, "issuerAuth payload must be tag 24")
    require(mso_tag.value == parsed.mso, "issuerAuth tag-24 payload must wrap exact MSO bytes")

    x5chain = issuer_auth[1].get(33)
    require(isinstance(x5chain, list) and len(x5chain) >= 1, "issuerAuth x5chain header missing")
    cert = x509.load_der_x509_certificate(x5chain[0])
    require(cert.subject.rfc4514_string(), "issuerAuth x5chain certificate subject missing")
    issuer_signature = verify_cose_sign1(
        cose_sign1=issuer_auth,
        public_key=cert.public_key(),
        label="issuerAuth",
    )

    device_signed = doc["deviceSigned"]
    device_signature = device_signed["deviceAuth"]["deviceSignature"]
    device_public_key = public_key_from_cose_key(parsed.mso_map["deviceKeyInfo"]["deviceKey"])
    device_signature_summary = verify_cose_sign1(
        cose_sign1=device_signature,
        public_key=device_public_key,
        label="deviceSignature",
    )
    require(
        device_signature[2] == (generated_dir / "device-authentication.cbor").read_bytes(),
        "deviceSignature payload does not match generated device-authentication.cbor",
    )
    device_auth_tag = cbor2.loads(device_signature[2])
    require(
        isinstance(device_auth_tag, cbor2.CBORTag) and device_auth_tag.tag == 24,
        "deviceSignature payload must be tag 24",
    )
    device_auth_bytes = device_auth_tag.value
    device_auth = cbor2.loads(device_auth_bytes)
    require(device_auth[0] == "DeviceAuthentication", "DeviceAuthentication context string mismatch")
    require(device_auth[2] == DOCTYPE, "DeviceAuthentication docType mismatch")
    session_transcript_bytes = raw_array_item(device_auth_bytes, index=1)
    require(
        session_transcript_bytes == expected_session_transcript,
        "DeviceAuthentication SessionTranscript bytes do not match request fixture",
    )
    device_name_spaces_tag = device_auth[3]
    require(
        isinstance(device_name_spaces_tag, cbor2.CBORTag) and device_name_spaces_tag.tag == 24,
        "DeviceAuthentication DeviceNameSpaces must be tag 24",
    )
    require(
        cbor2.loads(device_name_spaces_tag.value) == {},
        "DeviceAuthentication DeviceNameSpaces should be an empty map for this fixture",
    )
    require(
        device_signed["nameSpaces"] == device_name_spaces_tag,
        "deviceSigned.nameSpaces must match DeviceAuthentication DeviceNameSpaces",
    )

    if (generated_dir / "issuer-signed-item-tag24.cbor").exists():
        require(
            (generated_dir / "issuer-signed-item-tag24.cbor").read_bytes()
            == parsed.issuer_signed_item_tag24,
            "checked-out issuer-signed-item-tag24.cbor does not match document contents",
        )
    if (generated_dir / "mso.cbor").exists():
        require((generated_dir / "mso.cbor").read_bytes() == parsed.mso, "mso.cbor does not match issuerAuth payload")
    if (generated_dir / "issuer-auth.cbor").exists():
        issuer_auth_tag18 = cbor2.dumps(cbor2.CBORTag(18, issuer_auth), canonical=True)
        require(
            (generated_dir / "issuer-auth.cbor").read_bytes() == cbor2.dumps(issuer_auth, canonical=False)
            or (generated_dir / "issuer-auth.cbor").read_bytes() == issuer_auth_tag18
            or cbor2.loads((generated_dir / "issuer-auth.cbor").read_bytes()) == issuer_auth,
            "issuer-auth.cbor does not decode to document issuerAuth",
        )

    walk = expected_walk(parsed)
    return {
        "ok": True,
        "documentSha256": sha256_hex(document_bytes),
        "issuerSignedItemTag24Sha256": sha256_hex(parsed.issuer_signed_item_tag24),
        "msoSha256": sha256_hex(parsed.mso),
        "issuerCertificateSubject": cert.subject.rfc4514_string(),
        "cose": {
            "issuerAuth": issuer_signature,
            "deviceSignature": device_signature_summary,
            "deviceAuthenticationSessionTranscriptHex": session_transcript_bytes.hex(),
        },
        "walk": walk,
    }


def verify_cose_sign1(cose_sign1: list[Any], public_key: Any, label: str) -> dict[str, Any]:
    require(isinstance(cose_sign1, list) and len(cose_sign1) == 4, f"{label} must be a COSE_Sign1 array")
    protected_bytes, _unprotected, payload, signature = cose_sign1
    require(isinstance(protected_bytes, bytes), f"{label} protected header must be bytes")
    require(isinstance(payload, bytes), f"{label} payload must be bytes")
    require(isinstance(signature, bytes) and len(signature) == 64, f"{label} signature must be raw P-256 r||s")
    protected = cbor2.loads(protected_bytes)
    require(protected.get(1) == -7, f"{label} protected alg must be ES256 (-7)")
    sig_structure = cbor2.dumps(["Signature1", protected_bytes, b"", payload])
    der_signature = encode_dss_signature(
        int.from_bytes(signature[:32], "big"),
        int.from_bytes(signature[32:], "big"),
    )
    public_key.verify(der_signature, sig_structure, ec.ECDSA(hashes.SHA256()))
    return {
        "alg": "ES256",
        "payloadSha256": sha256_hex(payload),
        "sigStructureSha256": sha256_hex(sig_structure),
        "verified": True,
    }


def public_key_from_cose_key(cose_key: dict[Any, Any]) -> ec.EllipticCurvePublicKey:
    require(cose_key.get(1) == 2, "MSO deviceKey must be COSE EC2")
    require(cose_key.get(-1) == 1, "MSO deviceKey curve must be P-256")
    x = cose_key.get(-2)
    y = cose_key.get(-3)
    require(isinstance(x, bytes) and len(x) == 32, "MSO deviceKey x coordinate missing")
    require(isinstance(y, bytes) and len(y) == 32, "MSO deviceKey y coordinate missing")
    return ec.EllipticCurvePublicNumbers(
        int.from_bytes(x, "big"),
        int.from_bytes(y, "big"),
        ec.SECP256R1(),
    ).public_key()


def raw_array_item(encoded: bytes, index: int) -> bytes:
    offset, major, length = read_head(encoded, 0)
    require(major == 4 and length is not None, "expected definite-length CBOR array")
    require(index < length, "requested array item index out of range")
    for i in range(length):
        start = offset
        offset = skip_item(encoded, offset)
        if i == index:
            return encoded[start:offset]
    raise AssertionError("unreachable")


def skip_item(encoded: bytes, offset: int) -> int:
    offset, major, length = read_head(encoded, offset)
    if major in (0, 1):
        return offset
    if major in (2, 3):
        require(length is not None, "indefinite-length CBOR strings are unsupported")
        return offset + length
    if major == 4:
        require(length is not None, "indefinite-length CBOR arrays are unsupported")
        for _ in range(length):
            offset = skip_item(encoded, offset)
        return offset
    if major == 5:
        require(length is not None, "indefinite-length CBOR maps are unsupported")
        for _ in range(length * 2):
            offset = skip_item(encoded, offset)
        return offset
    if major == 6:
        return skip_item(encoded, offset)
    if major == 7:
        return offset
    raise AssertionError(f"unsupported CBOR major type {major}")


def read_head(encoded: bytes, offset: int) -> tuple[int, int, int | None]:
    require(offset < len(encoded), "unexpected end of CBOR")
    head = encoded[offset]
    offset += 1
    major = head >> 5
    ai = head & 0x1F
    if ai < 24:
        return offset, major, ai
    if ai == 24:
        require(offset + 1 <= len(encoded), "unexpected end of CBOR uint8")
        return offset + 1, major, encoded[offset]
    if ai == 25:
        require(offset + 2 <= len(encoded), "unexpected end of CBOR uint16")
        return offset + 2, major, int.from_bytes(encoded[offset : offset + 2], "big")
    if ai == 26:
        require(offset + 4 <= len(encoded), "unexpected end of CBOR uint32")
        return offset + 4, major, int.from_bytes(encoded[offset : offset + 4], "big")
    if ai == 27:
        require(offset + 8 <= len(encoded), "unexpected end of CBOR uint64")
        return offset + 8, major, int.from_bytes(encoded[offset : offset + 8], "big")
    if ai == 31:
        return offset, major, None
    raise AssertionError(f"reserved CBOR additional info {ai}")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


if __name__ == "__main__":
    main()
