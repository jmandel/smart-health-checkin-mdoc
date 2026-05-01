from __future__ import annotations

import contextlib
import hashlib
import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import cbor2
import pymdoccbor.mso.issuer as mso_issuer_module
import pymdoccbor.x509 as pymdoc_x509_module
from cbor_diag import cbor2diag
from pymdoccbor.mdoc.issuer import MdocCborIssuer

from fixtures_tool.constants import (
    DOCTYPE,
    ELEMENT,
    FIXED_CERT_INFO,
    FIXED_ISSUER_KEY,
    FIXED_VALIDITY,
    MINIMAL_SMART_RESPONSE,
    NAMESPACE,
)


FIXED_NOW = datetime(2026, 4, 30, 12, 0, 0)
FIXED_CERT_SERIAL = 0x5348434845434B494E
FIXED_SALT_BYTE = 0xA5


class FixedDateTime(datetime):
    @classmethod
    def utcnow(cls) -> datetime:
        return FIXED_NOW


@contextlib.contextmanager
def deterministic_pymdoc_context() -> Iterator[None]:
    """Patch pyMDOC-CBOR's deterministic fixture inputs.

    pyMDOC-CBOR uses random salts, current time, and random certificate serials.
    We pin those so MSO payload and value digest inputs are stable. ECDSA
    signatures may still be nondeterministic, so final document bytes should be
    treated as parse fixtures first.
    """

    old_datetime = mso_issuer_module.datetime.datetime
    old_token_bytes = mso_issuer_module.secrets.token_bytes
    old_random_serial_number = pymdoc_x509_module.x509.random_serial_number

    mso_issuer_module.datetime.datetime = FixedDateTime
    mso_issuer_module.secrets.token_bytes = lambda n: bytes([FIXED_SALT_BYTE]) * n
    pymdoc_x509_module.x509.random_serial_number = lambda: FIXED_CERT_SERIAL

    try:
        yield
    finally:
        mso_issuer_module.datetime.datetime = old_datetime
        mso_issuer_module.secrets.token_bytes = old_token_bytes
        pymdoc_x509_module.x509.random_serial_number = old_random_serial_number


def canonical_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def cbor_diag(bytes_: bytes) -> str:
    return cbor2diag(bytes_)


def write_bytes_with_debug(path: Path, bytes_: bytes) -> None:
    path.write_bytes(bytes_)
    path.with_suffix(path.suffix + ".hex").write_text(bytes_.hex() + "\n")
    path.with_suffix(".diag").write_text(cbor_diag(bytes_) + "\n")


def sha256_hex(bytes_: bytes) -> str:
    return hashlib.sha256(bytes_).hexdigest()


def default_input() -> dict[str, Any]:
    return {
        "docType": DOCTYPE,
        "namespace": NAMESPACE,
        "elementIdentifier": ELEMENT,
        "smartResponse": MINIMAL_SMART_RESPONSE,
    }


def load_input(path: Path | None) -> dict[str, Any]:
    if path is None:
        return default_input()
    return json.loads(path.read_text())


def issue_document(input_data: dict[str, Any]) -> tuple[bytes, dict[str, Any]]:
    smart_response = input_data["smartResponse"]
    smart_response_json = canonical_json(smart_response)

    with deterministic_pymdoc_context():
        cert_info = dict(FIXED_CERT_INFO)
        cert_info["not_valid_before"] = FixedDateTime(2026, 1, 1, tzinfo=timezone.utc)
        cert_info["not_valid_after"] = FixedDateTime(2031, 1, 1, tzinfo=timezone.utc)

        issuer = MdocCborIssuer(
            private_key=FIXED_ISSUER_KEY,
            alg="ES256",
            cert_info=cert_info,
        )
        document = issuer.new(
            doctype=input_data.get("docType", DOCTYPE),
            data={
                input_data.get("namespace", NAMESPACE): {
                    input_data.get("elementIdentifier", ELEMENT): smart_response_json,
                }
            },
            devicekeyinfo=FIXED_ISSUER_KEY,
            validity=FIXED_VALIDITY,
        )
        document_bytes = cbor2.dumps(document)

    return document_bytes, {
        "smartResponseJson": smart_response_json,
        "document": document,
    }


@dataclass(frozen=True)
class ParsedDocument:
    document: dict[str, Any]
    doc_type: str
    namespace: str
    element_identifier: str
    element_value: str
    smart_response: dict[str, Any]
    issuer_signed_item_tag24: bytes
    issuer_signed_item_inner: bytes
    issuer_auth: bytes
    mso_tag24: bytes
    mso: bytes
    mso_map: dict[str, Any]
    digest_id: int
    recomputed_digest: bytes
    mso_digest: bytes

    @property
    def digest_matches(self) -> bool:
        return self.recomputed_digest == self.mso_digest


def parse_document(document_bytes: bytes) -> ParsedDocument:
    document = cbor2.loads(document_bytes)
    doc = document["documents"][0]
    issuer_signed = doc["issuerSigned"]
    namespace, items = next(iter(issuer_signed["nameSpaces"].items()))
    issuer_signed_item = items[0]

    issuer_signed_item_tag24 = cbor2.dumps(issuer_signed_item, canonical=True)
    issuer_signed_item_inner = issuer_signed_item.value
    issuer_signed_item_map = cbor2.loads(issuer_signed_item_inner)

    issuer_auth_list = issuer_signed["issuerAuth"]
    issuer_auth = cbor2.dumps(cbor2.CBORTag(18, issuer_auth_list), canonical=True)
    mso_tag = cbor2.loads(issuer_auth_list[2])
    mso_tag24 = cbor2.dumps(mso_tag, canonical=True)
    mso = mso_tag.value
    mso_map = cbor2.loads(mso)

    digest_id = issuer_signed_item_map["digestID"]
    recomputed_digest = hashlib.sha256(issuer_signed_item_tag24).digest()
    mso_digest = mso_map["valueDigests"][namespace][digest_id]

    element_value = issuer_signed_item_map["elementValue"]
    smart_response = json.loads(element_value)

    return ParsedDocument(
        document=document,
        doc_type=doc["docType"],
        namespace=namespace,
        element_identifier=issuer_signed_item_map["elementIdentifier"],
        element_value=element_value,
        smart_response=smart_response,
        issuer_signed_item_tag24=issuer_signed_item_tag24,
        issuer_signed_item_inner=issuer_signed_item_inner,
        issuer_auth=issuer_auth,
        mso_tag24=mso_tag24,
        mso=mso,
        mso_map=mso_map,
        digest_id=digest_id,
        recomputed_digest=recomputed_digest,
        mso_digest=mso_digest,
    )


def expected_walk(parsed: ParsedDocument) -> dict[str, Any]:
    return {
        "docType": parsed.doc_type,
        "namespace": parsed.namespace,
        "elementIdentifier": parsed.element_identifier,
        "digestID": parsed.digest_id,
        "digestMatches": parsed.digest_matches,
        "recomputedDigestSha256": parsed.recomputed_digest.hex(),
        "msoDigestSha256": parsed.mso_digest.hex(),
        "smartResponse": parsed.smart_response,
        "mso": {
            "docType": parsed.mso_map["docType"],
            "version": parsed.mso_map["version"],
            "digestAlgorithm": parsed.mso_map["digestAlgorithm"],
        },
    }


def manifest_for(out_dir: Path, parsed: ParsedDocument) -> dict[str, Any]:
    files = [
        "document.cbor",
        "issuer-signed-item-tag24.cbor",
        "issuer-signed-item.cbor",
        "value-digest-input.cbor",
        "issuer-auth.cbor",
        "mso-tag24.cbor",
        "mso.cbor",
        "smart-response.json",
        "expected-walk.json",
    ]
    return {
        "label": out_dir.name,
        "source": "fixtures-tool/pyMDOC-CBOR",
        "pymdoccbor": "1.3.0",
        "protocol": "org-iso-mdoc",
        "docType": parsed.doc_type,
        "namespace": parsed.namespace,
        "element": parsed.element_identifier,
        "containsPhi": False,
        "notes": [
            "document.cbor may contain nondeterministic ECDSA signature bytes.",
            "value-digest-input.cbor is the exact tag-24 issuer item digest input.",
        ],
        "sha256": {
            name: sha256_hex((out_dir / name).read_bytes())
            for name in files
            if (out_dir / name).exists()
        },
    }


def write_fixture(out_dir: Path, input_data: dict[str, Any], force: bool = False) -> dict[str, Any]:
    if out_dir.exists():
        if not force:
            raise FileExistsError(f"{out_dir} already exists; pass --force to replace it")
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    document_bytes, issue_debug = issue_document(input_data)
    parsed = parse_document(document_bytes)

    input_to_write = dict(input_data)
    input_to_write["smartResponseJson"] = issue_debug["smartResponseJson"]
    (out_dir / "input.json").write_text(json.dumps(input_to_write, indent=2, sort_keys=True) + "\n")
    (out_dir / "smart-response.json").write_text(
        json.dumps(parsed.smart_response, indent=2, sort_keys=True) + "\n"
    )
    (out_dir / "expected-walk.json").write_text(
        json.dumps(expected_walk(parsed), indent=2, sort_keys=True) + "\n"
    )

    write_bytes_with_debug(out_dir / "document.cbor", document_bytes)
    write_bytes_with_debug(out_dir / "issuer-signed-item-tag24.cbor", parsed.issuer_signed_item_tag24)
    write_bytes_with_debug(out_dir / "issuer-signed-item.cbor", parsed.issuer_signed_item_inner)
    write_bytes_with_debug(out_dir / "value-digest-input.cbor", parsed.issuer_signed_item_tag24)
    write_bytes_with_debug(out_dir / "issuer-auth.cbor", parsed.issuer_auth)
    write_bytes_with_debug(out_dir / "mso-tag24.cbor", parsed.mso_tag24)
    write_bytes_with_debug(out_dir / "mso.cbor", parsed.mso)

    manifest = manifest_for(out_dir, parsed)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest
