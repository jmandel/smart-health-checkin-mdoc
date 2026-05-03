# T1.C orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- `../t1a-editorial-terminology/canonical.md`
- `../t1a-editorial-terminology/orchestrator-review.md`
- `../t1b-purpose-scope-goals/canonical.md`
- `../t1b-purpose-scope-goals/orchestrator-review.md`

Decision: T1.C is accepted as the canonical architecture, roles, flows, and
design-principles cutpoint.

Edits applied:

1. Adjusted the same-device sequence diagram so SMART request construction is
   shown as Requester/Verifier-local work before Digital Credentials API
   mediation, not as a message sent to the Browser / User Agent.
2. Adjusted the kiosk sequence diagram so Completion display retrieval,
   decryption, validation, and display are clearer and do not imply that the
   Kiosk creator decrypts the result.

Blocking issues:

- None.

Downstream notes:

- T2 request/response sections must preserve the domain split: SMART request
  and SMART response are the transport-neutral clinical content model.
- T3 same-device work should own the exact direct `org-iso-mdoc` identifiers,
  byte constructions, encryption, SessionTranscript, and validation rules.
- T4 kiosk work should preserve wrapper/re-entry semantics: the kiosk payload
  embeds the SMART request directly as `smartRequest`, the phone re-enters the
  same-device presentation flow, and the Submission service is untrusted for
  plaintext clinical content.
- §8 should define the precise mdoc retention signal without turning it into a
  Wallet-storage, EHR write-back, or retention-duration mandate.
