from __future__ import annotations

import base64
import json
from datetime import datetime, timezone

DOCTYPE = "org.smarthealthit.checkin.1"
NAMESPACE = "org.smarthealthit.checkin"
SMART_RESPONSE_ELEMENT_ID = "smart_health_checkin_response"
DYNAMIC_ELEMENT_PREFIX = "shc1j"

MINIMAL_SMART_REQUEST = {
    "type": "smart-health-checkin-request",
    "version": "1",
    "id": "fixture-minimal-request",
    "purpose": "Clinic check-in",
    "fhirVersions": ["4.0.1"],
    "items": [
        {
            "id": "patient",
            "title": "Patient demographics",
            "summary": "Demographics for check-in",
            "required": True,
            "content": {
                "kind": "fhir.resources",
                "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
            },
            "accept": ["application/fhir+json"],
        }
    ],
}


def _b64url_json(value: dict) -> str:
    raw = json.dumps(value, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


FALLBACK_DYNAMIC_ELEMENT = f"{DYNAMIC_ELEMENT_PREFIX}.{_b64url_json(MINIMAL_SMART_REQUEST)}"
ELEMENT = SMART_RESPONSE_ELEMENT_ID

FIXED_ISSUER_KEY = {
    "KTY": "EC2",
    "CURVE": "P_256",
    "ALG": "ES256",
    "D": b"<\xe5\xbc;\x08\xadF\x1d\xc5\x0czR'T&\xbb\x91\xac\x84\xdc\x9ce\xbf\x0b,\x00\xcb\xdd\xbf\xec\xa2\xa5",
    "KID": b"smart-checkin-fixture-key",
}

FIXED_CERT_INFO = {
    "country_name": "US",
    "organization_name": "SMART Health Check-in Test",
    "common_name": "SMART Health Check-in Fixture",
    "san_url": "https://rp.example.test",
    "not_valid_before": datetime(2026, 1, 1, tzinfo=timezone.utc),
    "not_valid_after": datetime(2031, 1, 1, tzinfo=timezone.utc),
}

FIXED_VALIDITY = {
    "issuance_date": "2026-01-01",
    "expiry_date": "2031-01-01",
}

MINIMAL_SMART_RESPONSE = {
    "type": "smart-health-checkin-response",
    "version": "1",
    "requestId": "fixture-minimal-request",
    "artifacts": [
        {
            "id": "a1",
            "mediaType": "application/fhir+json",
            "fhirVersion": "4.0.1",
            "fulfills": ["patient"],
            "value": {
                "resourceType": "Patient",
                "id": "demo",
            },
        }
    ],
    "requestStatus": [{"item": "patient", "status": "fulfilled"}],
}
