# wallet-android

Android wallet for SMART Health Check-in over `org-iso-mdoc` (Profile B —
see [`../profiles/org-iso-mdoc.md`](../profiles/org-iso-mdoc.md)).

Bootstrapped from `~/work/smart-health-checkin-demo/android/` — a native
Compose source-app demo for the older OID4VP browser-shim flow. We kept the
UX (consent screens, FHIR Questionnaire renderer, theme, sample data) and
swapped the legacy launching/encryption layer for the Digital Credentials
API path.

## Stack

- AGP 8.7.3, Kotlin 2.0.21, Compose BOM 2024.12.01.
- Java 17, minSdk 26, target/compileSdk 35.
- `androidx.credentials` + `androidx.credentials.registry-provider 1.0.0-SNAPSHOT`
  (from `https://androidx.dev/snapshots/latest/artifacts/repository`,
  matching the parent CMWallet POC).
- No Nimbus JOSE and no JWS/JWE — those went with Stage B. The only direct
  network fetch in the wallet path is verifier-supplied `questionnaireUrl`
  hydration before rendering consent.

## Layout

```
wallet-android/
  build.gradle                # plugins
  settings.gradle             # androidx.dev snapshot repo + module include
  gradle.properties, gradle/wrapper/...
  app/
    build.gradle              # AGP / Compose / credentials deps
    src/main/
      AndroidManifest.xml     # MainActivity (launcher) + HandlerActivity (DC API fulfillment)
      assets/
        matcher.wasm          # built from ../matcher by Gradle unless -Pskip-matcher is set
        demo-data/            # bundled CARIN Coverage, IPS bundle, migraine Questionnaire, …
      java/org/smarthealthit/checkin/wallet/
        MainActivity.kt       # home screen (registration UI), preserved Compose tree (DemoApp + screens), state classes (ScreenState, VerifiedRequest, …)
        HandlerActivity.kt    # DC API entry point — decodes deviceRequest, drives consent UI
        Registration.kt       # RegistryManager.registerCredentials wrapper
        SmartRequest.kt       # SMART JSON → VerifiedRequest UI hydrator
        DemoWalletStore.kt    # bundled fixture-backed wallet store
        QuestionnaireResponseBuilder.kt # Questionnaire answers → QuestionnaireResponse
        SmartCheckinResponseFactory.kt  # selected UI items → SMART response JSON
        SmartHealthMdocResponder.kt     # mdoc DeviceResponse + HPKE wrapper
        MdocCbor.kt           # tiny CBOR reader + DeviceRequestParser
      res/values/             # strings, theme
```

## Run

```bash
cd wallet-android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The first build will download dependencies, including the AndroidX snapshot
repo. Network access required.

## End-to-end flow today

1. Launch the app → MainActivity home screen.
2. Tap **Register with Credential Manager** → `Registration.register(...)`
   calls `RegistryManager.registerCredentials` twice (once with
   `DigitalCredential.TYPE_DIGITAL_CREDENTIAL`, once with the legacy
   `com.credman.IdentityCredential` type for older Chrome compat).
3. The real Rust WASM matcher (built from sibling `../matcher/`) byte-scans
   the request for the SMART Health Check-in doctype and emits one entry
   with the embedded SMART starburst icon. The Gradle `buildMatcherWasm`
   task in this module's `app/build.gradle` runs `../matcher/build.sh`
   (`cargo +nightly -Z panic-immediate-abort -Z build-std`, plus
   `wasm-opt -Oz`) before each Android build, then `copyMatcherWasm`
   places the output at `app/src/main/assets/matcher.wasm`. Pass
   `-Pskip-matcher` to reuse whatever's already there if your Rust
   toolchain isn't ready.
4. A matching verifier request surfaces the wallet entry; tapping it routes via the
   `androidx.credentials.registry.provider.action.GET_CREDENTIAL` intent
   filter to **HandlerActivity**, which:
   - retrieves the `ProviderGetCredentialRequest`,
   - finds the `org-iso-mdoc` option,
   - base64-decodes `data.deviceRequest`,
   - CBOR-walks to `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`,
   - fetches any `questionnaireUrl` resources and hydrates a `VerifiedRequest`
     for the existing Compose consent UI,
   - seeds canned questionnaire answers from `DemoWalletStore` by
     `(questionnaire.url, questionnaire.version, linkId)`,
   - on submit/decline, writes a debug bundle to
     `/data/data/org.smarthealthit.checkin.wallet/files/handler-runs/<runId>/`
     (`manifest.json`, `credential-manager-request.json`,
     `device-request.{cbor,b64u,hex}`, `encryption-info.{cbor,b64u,hex}`,
     `session-transcript.cbor`, `smart-request.json`,
     `smart-request.hydrated.json`, `submit.json`, `smart-response.json`,
     `device-response.cbor`, `dcapi-response.cbor`, HPKE `enc` and
     `cipherText`, COSE/MSO intermediates, and `.hex`/`.b64u` sidecars for
     binary artifacts),
   - uses `DemoWalletStore` to resolve selected fixture-backed FHIR resources
     and build QuestionnaireResponse resources,
   - returns `setGetCredentialResponse(DigitalCredential(...))` containing an
     encrypted direct-mdoc `DeviceResponse`.

`adb pull` works to grab debug bundles:

```sh
../scripts/pull-android-handler-run.sh
```

That command copies the latest handler run to
`artifacts/android-handler-runs/<runId>/` and runs the RP web inspectors into
`analysis/request/`, `analysis/dcapi-response/`, and
`analysis/device-response/`. Pass an output root and run id to override:

```sh
../scripts/pull-android-handler-run.sh /tmp/shc-runs run-1777605725018
```

For HPKE-open debugging, pair the Android bundle with the RP web console event
`@@SHC@@REQUEST_ARTIFACTS@@...`; it includes the verifier private JWK,
session transcript, request CBOR, and encryptionInfo in hex/base64url form.

## Validation commands

Fast Android/JVM coverage:

```sh
cd wallet-android
./gradlew :app:testDebugUnitTest --no-daemon
```

Full direct-mdoc response validation:

```sh
cd ..
bash vendor/scripts/validate-android-mdoc-response.sh
```

The full validation command regenerates deterministic request fixtures, has
Android/Kotlin emit a deterministic wallet response, opens that response with
the RP web HPKE implementation, inspects the decrypted `DeviceResponse`, and
runs pyMDOC-style issuer-signed byte checks.

The promoted real Chrome/Android run is checked in under
`../fixtures/dcapi-requests/real-chrome-android-smart-checkin/` and
`../fixtures/responses/real-chrome-android-smart-checkin/`. Targeted tests cover
that real request fixture and its mdoc/COSE response bytes:

```sh
./gradlew :app:testDebugUnitTest --tests 'org.smarthealthit.checkin.wallet.RequestFixtureParserTest' --no-daemon
```

For a manual browser-to-Android smoke run:

1. Start the RP web verifier with `cd rp-web && bun dev`.
2. Build/install the Android app with `cd wallet-android && ./gradlew :app:assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.
3. Launch the app and tap **Register with Credential Manager**.
4. Open the local verifier in Chrome with Digital Credentials support enabled,
   request SMART Health Check-in, select the wallet entry, and accept.
5. Pull `/data/data/org.smarthealthit.checkin.wallet/files/handler-runs/<runId>/`
   with the `adb run-as` commands above.
6. Sanitize the bundle if needed, then promote it to
   `fixtures/dcapi-requests/` or validate response artifacts with RP web tools.

## Sample data

Bundled under `app/src/main/assets/demo-data/`:

- `carin-coverage.json` — CARIN-IG Coverage resource.
- `clinical-history-bundle.json` — IPS-style FHIR bundle.
- `migraine-questionnaire.json` — Chronic Migraine 3-month follow-up
  Questionnaire.
- `migraine-autofill-values.json` — prefill answer keys for the above.
- `sbc-insurance-plan.json` — Summary of Benefits and Coverage.

`DemoWalletStore` is the demo wallet's source of truth for this data. It maps
coverage, clinical, and plan requests to the bundled FHIR fixtures. For
Questionnaire requests, it builds a FHIR `QuestionnaireResponse` from UI answers
plus canned defaults loaded from `migraine-autofill-values.json`, keyed by the
requested Questionnaire's canonical URL, version, and each `linkId`.

## What's not yet wired (next phases)

- **Production wallet store**: replace `DemoWalletStore` with a real holder
  data source and profile-aware resource matching.
- **Matcher hardening**: keep the Rust WASM matcher aligned with the
  byte-search contract in `profiles/org-iso-mdoc.md`.
