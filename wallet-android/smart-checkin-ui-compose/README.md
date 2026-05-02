# smart-checkin-ui-compose

`smart-checkin-ui-compose` is the optional Compose UI layer for the Android
wallet. It depends on the core models and can call the registration adapter, but
it should not own protocol parsing, HPKE, CBOR, or holder-data policy.

The current module still contains demo-oriented UI code from the original
single-app prototype. The boundary is useful now, and the next hardening step is
to split stable reusable components from demo-only `MainActivity` scaffolding.

## What this module owns

- `MainActivity`: launcher/home screen for the demo app.
- Registration UI state and button flow.
- `SampleHealthTheme`.
- Consent/review UI state and helper composables preserved from the demo.
- Questionnaire input rendering helpers for common FHIR Questionnaire item
  types.

## What this module should not own

- SMART request validation or classification: use `smart-checkin-core`.
- Holder-data lookup: implement `SmartHealthWalletStore` in the app or wallet
  data module.
- Direct mdoc parsing or response encryption: use `smart-checkin-mdoc`.
- Credential Manager registration internals: use
  `smart-checkin-credential-manager`.
- Backend/kiosk session state.

## Registration home example

The launcher screen calls:

```kotlin
registration = when (val r = Registration.register(this@MainActivity)) {
    is RegistrationResult.Success -> RegistrationState.Registered(
        matcherBytes = r.matcherBytes,
        credentialsBytes = r.credentialsBytes,
        mode = r.mode,
        registeredTypes = r.registeredTypes,
    )
    is RegistrationResult.Failure -> RegistrationState.Failed(r.message)
}
```

This keeps the UI responsible for presenting status while the registration
module owns registry-provider calls.

## Consent UI model

Consent screens consume `VerifiedRequest` and `RequestItem` from
`smart-checkin-core`:

```kotlin
data class VerifiedRequest(
    val requestId: String,
    val verifierOrigin: String,
    val rawSmartRequestJson: String,
    val readerAuth: ReaderAuthVerification,
    val items: List<RequestItem>,
)
```

Each `RequestItem` includes a UI title/subtitle, `RequestKind`, raw metadata,
and accepted media types. The UI can show a user-friendly review without
knowing how the request was carried over mdoc.

## Future reusable components

The intended stable React-like/Compose renderer kit should expose small
components such as:

- request summary header;
- verifier/readerAuth status row;
- request item list with required/optional state;
- FHIR resource/profile-family request cards;
- Questionnaire prompt renderer;
- selected/declined item review;
- response artifact/status preview;
- debug/evidence panel for demos.

Those components should accept core models and callbacks. They should not
perform protocol parsing, Credential Manager calls, or wallet-store lookups.

## Dependency rules

This module can depend on:

- `smart-checkin-core` for models;
- `smart-checkin-credential-manager` for launcher registration UI;
- Compose/Material/lifecycle libraries.

It currently depends on `smart-checkin-mdoc` because the demo UI module is still
coarse-grained. As the UI is hardened, direct mdoc imports should move into the
app/handler layer so reusable UI components remain transport-neutral.
