# T1.A adjudication — editorial conventions and terminology

## Attempts reviewed

- `spec-work/t1a-editorial-terminology/attempt-01.md`
- `spec-work/t1a-editorial-terminology/attempt-02.md`
- `spec-work/t1a-editorial-terminology/attempt-03.md`
- `spec-work/t1a-editorial-terminology/attempt-04.md`
- `spec-work/t1a-editorial-terminology/attempt-05.md`

## Strongest contributions

- **Attempt 01**: Best compact terminology table; clearly distinguishes the clinical content model from presentation transport; explicitly says `profilesFrom[]` is an array and that `profiles[]` plus `profilesFrom[]` are additive.
- **Attempt 02**: Best layering language for the reading guide; useful definitions for clinical request/response, transport-neutral, and conformance target; good downstream notes on preserving direct `smartRequest` embedding.
- **Attempt 03**: Best caution against over-specifying platform behavior; useful phrasing that envelopes do not change underlying clinical semantics; strong definitions for artifact/media-type handling and source-of-truth Markdown style.
- **Attempt 04**: Best pure-Markdown style guidance and reference-label format; useful concrete byte-string presentation rules; good distinction between Requester and Verifier.
- **Attempt 05**: Strongest active-protocol alignment for same-device direct `org-iso-mdoc`, kiosk as wrapper/re-entry, and named kiosk roles; useful terms for Holder data source and Completion display.

## Contradictions and resolutions

- **Title scope**: Attempts 02, 03, and 05 put “over W3C Digital Credentials API” in the main title; attempt 01 keeps the shorter title. The outline treats the W3C/DC API phrase as an example title while also preserving a transport-neutral clinical model (`spec.md.outline` lines 9–14, 20–24). I chose **SMART Health Check-in 1.0** as the title with a subtitle/profile sentence naming the base W3C Digital Credentials API direct `org-iso-mdoc` flow, avoiding a title that implies the clinical model is not reusable.
- **Active same-device carrier**: All attempts broadly agree on direct `org-iso-mdoc`; the repo confirms this is active. The active profile identifies `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, and `ItemsRequest.requestInfo` as the request carrier (`docs/profiles/org-iso-mdoc.md` lines 1–16, 53–66). The implementation constants match those identifiers (`rp-web/src/protocol/index.ts` lines 42–46).
- **Kiosk wrapper details**: Some attempts use “cross-device submitter,” some use “phone presenter,” and some could be read as defining a separate kiosk clinical protocol. The repo resolves this toward a kiosk wrapper that embeds `smartRequest` directly and re-enters the same-device flow on the phone: `KioskRequestPayload.smartRequest` is a `SmartCheckinRequest` (`rp-web/src/kiosk/protocol.ts` lines 20–46), creation stores `smartRequest: input.smartRequest` directly (`rp-web/src/kiosk/protocol.ts` lines 139–162), and the phone submit page passes the resolved request into the same `SmartCheckinButton` DC API flow (`rp-web/src/kiosk/submit-main.tsx` lines 184–193). I standardized on **Phone presenter** and retained “submitter” only as a descriptive action where necessary.
- **Demo preset wrappers**: Attempts 01, 02, 04, and 05 explicitly reject demo preset wrappers; that is correct. The creator UI may choose a demo preset internally (`rp-web/src/kiosk/creator-main.tsx` lines 18–19), but the protocol payload embeds `smartRequest` directly (`rp-web/src/kiosk/protocol.ts` lines 150–162). The canonical text defines demo presets as non-protocol conveniences.
- **`profilesFrom` shape and semantics**: All attempts preserve the array shape, but attempt 05 overgeneralizes “additive selectors” to `resourceTypes` and other selectors. Current request docs state `profilesFrom` is a non-empty array of canonical URLs (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 279–297, 1070) and that `profiles` plus `profilesFrom` are additive (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 291–295, 1072). The same docs describe `resourceTypes` as optional narrowing (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 299–315). I therefore define **profile-selector additivity** only for `profiles[]` and `profilesFrom[]`; later §5 can define how `resourceTypes[]` constrains the selected set.
- **Base64url and hex formatting**: Attempts disagree on `0x` prefixes and whether decoders may accept padded base64url. The outline asks for hex and base64url-no-pad (`spec.md.outline` lines 35–38), and active DC API examples use base64url without padding (`docs/profiles/org-iso-mdoc.md` lines 18–37). I chose lowercase hex without `0x` for spec-authored values and unpadded base64url as the default presentation form, while leaving parser rejection/leniency to later field-specific normative text.
- **Normative overreach in front matter and conventions**: Attempts sometimes grant implementation licenses, require disclosure behavior, or impose parser rules in T1.A. Because front matter metadata and the publication venue are unresolved, the canonical front matter remains placeholder text. Conventions are normative only for interpreting the specification and BCP 14 keywords, not for creating active protocol behavior outside later sections.
- **Artifact definition**: Some attempts call artifacts “clinical payloads”; others call them response objects. The active model has `SmartArtifactBase` with `id`, `mediaType`, and `fulfills` (`rp-web/src/sdk/core.ts` lines 53–75), so the canonical definition describes an Artifact as a response object that contains or references clinical content.

## Terminology decisions for downstream sections

- Use **clinical content model** for the transport-neutral `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse` model.
- Use **SMART request** and **SMART response** for those JSON objects; do not use those terms for mdoc envelopes, kiosk pointers, encrypted submissions, or acknowledgments.
- Use **same-device presentation flow** for the base W3C Digital Credentials API direct `org-iso-mdoc` flow.
- Use **cross-device kiosk flow** for the wrapper that creates a pointer, resolves it on the phone, re-enters same-device presentation, and returns an encrypted submission.
- Use **Requester** for the party asking for clinical content and **Verifier** for the presentation-transport role that invokes and validates presentation.
- Use **Wallet** as the normal **Responder** and **Holder** for the patient/member/authorized person controlling disclosure.
- Use **Kiosk creator**, **Submission service**, **Phone presenter**, and **Completion display** as the four kiosk roles.
- Define **Profile family** as a canonical profile-family URL source for `profilesFrom[]`.
- Define **Profile-selector additivity** for `profiles[]` plus `profilesFrom[]`; do not imply that `resourceTypes[]` is additive.
- Keep the source-of-truth style pure Markdown; do not assume Bikeshed, HTML-only anchors, or generated hidden content.

## Open issues

None blocking for T1.A. Publication metadata, editor/contributor lists, final IPR boilerplate, final copyright holder, and exact bibliography metadata remain expected front-matter/final-editorial placeholders.
