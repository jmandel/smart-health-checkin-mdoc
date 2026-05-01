# Profiles

The active profile is:

| Profile | DC API protocol | Status |
| --- | --- | --- |
| [`org-iso-mdoc`](org-iso-mdoc.md) | `org-iso-mdoc` | **Active / implemented** |

The active direct mdoc transport uses:

- `ItemsRequest.requestInfo` for the SMART request JSON;
- stable response element `smart_health_checkin_response`;
- direct `dcapi` SessionTranscript;
- HPKE-sealed mdoc `DeviceResponse`;
- ES256 COSE issuer/device signatures.

The checked-in implementation still uses the prototype
`requestInfo.smart_health_checkin` payload key. The next implementation target is
`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`, using
`requestInfo["org.smarthealthit.checkin.request"]`.

Historical profiles are under `../archive/profiles/`, including the old
OpenID4VP/DCQL/JWE profile and an early `org-iso-mdoc` capture profile that
predated the real Android response capture.
