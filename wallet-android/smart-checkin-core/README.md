# smart-checkin-core

`smart-checkin-core` is the Android/Kotlin domain library for SMART Health
Check-in. It does not know about Digital Credentials API, mdoc, CBOR, HPKE,
Credential Manager, Android activities, or Compose.

Use this module when you need to:

- parse a SMART Check-in request JSON object into app-friendly request items;
- classify request items as coverage, plan, clinical, questionnaire, or unknown;
- model the wallet's holder-data lookup boundary;
- build a SMART Check-in response from user selections and wallet artifacts;
- build FHIR `QuestionnaireResponse` resources from captured answers.

## Key types and APIs

| API | Purpose |
| --- | --- |
| `ReaderAuthVerification` | Shared reader-auth status model for UI and response flows. |
| `VerifiedRequest` | App-facing consent model derived from a SMART request. |
| `RequestItem` | One requested item, including title, subtitle, kind, metadata, and accepted media types. |
| `RequestKind` | `Coverage`, `Plan`, `Clinical`, `Questionnaire`, or `Unknown`. |
| `SmartHealthWalletStore` | Holder-data boundary implemented by the app. |
| `SmartHealthWalletArtifact` | FHIR/other artifact returned by the wallet store. |
| `SmartRequestAdapter.build(...)` | Parses SMART request JSON into `VerifiedRequest`. |
| `SmartCheckinResponseFactory.build(...)` | Produces SMART Check-in response JSON from selected items and wallet data. |
| `QuestionnaireResponseBuilder.build(...)` | Converts Questionnaire answers into a FHIR `QuestionnaireResponse`. |

## Request parsing

`SmartRequestAdapter` expects the SMART JSON extracted from:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

Example:

```kotlin
val smartJson = JSONObject(rawSmartRequest)

val verified = SmartRequestAdapter.build(
    verifierOrigin = "https://clinic.example",
    nonce = "session-nonce",
    smartRequest = smartJson,
    readerAuth = ReaderAuthVerification.ABSENT,
)
```

The adapter validates the active SMART request envelope:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "clinic-checkin-123",
  "items": []
}
```

Each item must include `id`, `title`, `content`, and a non-empty `accept`
array.

## Request item classification

The adapter maps requested FHIR resources to coarse UI/store categories:

| Request signal | `RequestKind` |
| --- | --- |
| CARIN Coverage profile or `Coverage` resource type | `Coverage` |
| C4DIC/SBC InsurancePlan profile or `InsurancePlan` resource type | `Plan` |
| US Core, patient/clinical resource types, or matching `profilesFrom` family | `Clinical` |
| `content.kind == "questionnaire"` | `Questionnaire` |
| Anything else valid but not recognized | `Unknown` |

`profilesFrom` is the profile-family mechanism. For example, a verifier can ask
for "anything from US Core" instead of naming every StructureDefinition:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

When `profiles` and `profilesFrom` are both present, they are additive
selectors: exact profiles highlight specific records of interest, but do not
limit the broader profile-family request. The current adapter recognizes
canonical families such as US Core for UI classification. Production holder
matching can be more precise and should live behind `SmartHealthWalletStore`.

## Wallet-store boundary

Apps implement `SmartHealthWalletStore`:

```kotlin
class MyWalletStore : SmartHealthWalletStore {
    override fun resolveArtifact(
        item: RequestItem,
        questionnaireAnswers: Map<String, Any>,
    ): SmartHealthWalletArtifact {
        // Look up patient data, build FHIR JSON, or return a QuestionnaireResponse.
    }

    override fun prefillQuestionnaireAnswers(
        items: List<RequestItem>,
    ): Map<String, Any> {
        // Optional holder-side defaults.
    }
}
```

The store is intentionally app-owned. It is where production code decides how
to match patient records, handle missing data, and apply clinical policy.

## Response building

`SmartCheckinResponseFactory.build(...)` takes:

- the parsed `VerifiedRequest`;
- a map of selected/declined item IDs;
- Questionnaire answers;
- a `SmartHealthWalletStore`.

It returns SMART response JSON:

```kotlin
val responseJson = SmartCheckinResponseFactory.build(
    request = verified,
    selectedItems = selectedItems,
    questionnaireAnswers = questionnaireAnswers,
    walletStore = walletStore,
)
```

Items explicitly set to `false` become `declined`. Items whose resolved artifact
media type is not accepted become `unsupported`. Successful items get a FHIR or
other artifact plus `fulfilled` status.

## Questionnaire answers

Use `smartQuestionnaireAnswerKey(itemId, linkId)` to key answer snapshots:

```kotlin
val answers = mapOf(
    smartQuestionnaireAnswerKey("intake", "headache-days") to 8,
    smartQuestionnaireAnswerKey("intake", "uses-medication") to true,
)

val qr = QuestionnaireResponseBuilder.build(
    requestItem = questionnaireItem,
    answerSnapshot = answers,
)
```

The builder handles common Questionnaire answer types, repeats, answer options,
and simple `enableWhen` conditions.

## Dependency rules

This module should remain platform-light and protocol-neutral:

- no `androidx.credentials`;
- no Compose;
- no CBOR/COSE/HPKE;
- no network fetching;
- no demo fixture assumptions beyond generic JSON models.
