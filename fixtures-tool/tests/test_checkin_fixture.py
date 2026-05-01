from __future__ import annotations

import json
import subprocess
import sys

from fixtures_tool.constants import DOCTYPE, ELEMENT, NAMESPACE

EXPECTED_VALUE_DIGEST = "8f7b1f307aacd205224e10ce2b3857fa2dc48186b04655c118d7810e55d0d93c"


def test_issue_fixture_and_parse_round_trip(tmp_path):
    out_dir = tmp_path / "pymdoc-minimal"

    subprocess.run(
        [
            sys.executable,
            "bin/issue-checkin.py",
            "--out",
            str(out_dir),
        ],
        check=True,
    )

    expected_walk = json.loads((out_dir / "expected-walk.json").read_text())
    assert expected_walk["docType"] == DOCTYPE
    assert expected_walk["namespace"] == NAMESPACE
    assert expected_walk["elementIdentifier"] == ELEMENT
    assert expected_walk["digestMatches"] is True
    assert expected_walk["recomputedDigestSha256"] == EXPECTED_VALUE_DIGEST
    assert expected_walk["msoDigestSha256"] == EXPECTED_VALUE_DIGEST
    assert expected_walk["smartResponse"]["artifacts"][0]["data"]["resourceType"] == "Patient"
    assert expected_walk["smartResponse"]["answers"] == {"patient": ["a1"]}

    parsed = subprocess.run(
        [
            sys.executable,
            "bin/parse-checkin.py",
            str(out_dir / "document.cbor"),
        ],
        check=True,
        text=True,
        capture_output=True,
    )
    parsed_walk = json.loads(parsed.stdout)
    assert parsed_walk == expected_walk


def test_intermediate_artifacts_exist(tmp_path):
    out_dir = tmp_path / "pymdoc-minimal"
    subprocess.run(
        [
            sys.executable,
            "bin/issue-checkin.py",
            "--out",
            str(out_dir),
        ],
        check=True,
    )

    expected_files = [
        "document.cbor",
        "document.cbor.hex",
        "document.diag",
        "issuer-signed-item-tag24.cbor",
        "issuer-signed-item-tag24.cbor.hex",
        "issuer-signed-item-tag24.diag",
        "issuer-signed-item.cbor",
        "value-digest-input.cbor",
        "mso-tag24.cbor",
        "mso.cbor",
        "manifest.json",
    ]
    for name in expected_files:
        assert (out_dir / name).exists(), name

    manifest = json.loads((out_dir / "manifest.json").read_text())
    assert manifest["docType"] == DOCTYPE
    assert manifest["sha256"]["value-digest-input.cbor"]


def test_checked_in_real_android_response_fixture_verifies():
    parsed = subprocess.run(
        [
            sys.executable,
            "bin/check-android-response.py",
            "../fixtures/responses/real-chrome-android-smart-checkin",
        ],
        check=True,
        text=True,
        capture_output=True,
    )
    summary = json.loads(parsed.stdout)

    assert summary["ok"] is True
    assert summary["walk"]["docType"] == DOCTYPE
    assert summary["walk"]["namespace"] == NAMESPACE
    assert summary["walk"]["elementIdentifier"] == ELEMENT
    assert summary["walk"]["digestMatches"] is True
    assert summary["cose"]["issuerAuth"]["verified"] is True
    assert summary["cose"]["deviceSignature"]["verified"] is True
    assert summary["walk"]["smartResponse"]["answers"] == {
        "insurance": ["artifact-insurance"],
        "intake": ["artifact-intake"],
        "ips": ["artifact-ips"],
        "patient": ["artifact-patient"],
    }
