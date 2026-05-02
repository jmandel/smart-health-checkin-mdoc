# smart-checkin-credential-manager

`smart-checkin-credential-manager` is the Android registration adapter. It
registers this wallet with Android Credential Manager / registry-provider so
the wallet can appear in the system picker for Digital Credentials requests.

This module does not parse mdoc requests, build SMART responses, or render
consent UI. It only owns registration of the wallet entry and matcher bytes.

## Key APIs

| API | Purpose |
| --- | --- |
| `Registration.register(context)` | Clears existing registry records for this app and registers the SMART Health Check-in credential entry. |
| `Registration.PROTOCOL` | Active protocol string: `org-iso-mdoc`. |
| `Registration.REGISTRATION_ID` | Stable registration ID for the modern digital credential entry. |
| `RegistrationResult.Success` | Matcher bytes, credentials blob bytes, registration mode, and registered types. |
| `RegistrationResult.Failure` | Failure message suitable for UI/logging. |

Example:

```kotlin
lifecycleScope.launch {
    when (val result = Registration.register(this@MainActivity)) {
        is RegistrationResult.Success -> {
            // Show registered status.
        }
        is RegistrationResult.Failure -> {
            // Surface result.message to the user or logs.
        }
    }
}
```

## What registration carries

The registry entry includes:

- `matcher.wasm`, built from `wallet-android/app/matcher/` and copied into the
  app assets;
- a small JSON credentials blob describing one SMART Health Check-in credential:
  title, subtitle, doctype, namespace, response element, and package name.

The matcher reads the credentials blob and the incoming request bytes to decide
whether this wallet can handle the request. For this profile, it looks for the
SMART Health Check-in mdoc doctype/request markers and emits a wallet entry.

## Registration modes

The module supports a Gradle property:

```sh
./gradlew :app:assembleDebug -Pregistration-mode=both
./gradlew :app:assembleDebug -Pregistration-mode=modern-only
./gradlew :app:assembleDebug -Pregistration-mode=legacy-only
```

| Mode | Registered type |
| --- | --- |
| `both` | Modern `DigitalCredential.TYPE_DIGITAL_CREDENTIAL` and legacy `com.credman.IdentityCredential`. |
| `modern-only` | Modern digital credential type only. |
| `legacy-only` | Legacy identity credential type only. |

The default is `both` to support current browser/Chrome compatibility while the
platform APIs settle.

## Dependency rules

This module depends on AndroidX Credential Manager and registry-provider
snapshots. It should not depend on:

- `smart-checkin-mdoc`;
- Compose UI;
- demo wallet data;
- response generation.

Keeping registration narrow avoids a bad dependency direction where transport
or domain logic would need to know about Android registry details.
