# Implementation review issues — 2026-05-01

Cross-checked against spec at `../SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`. Each
item has a code citation and a severity. Suggested fix order at the bottom.

## Resolution status

Fixed in the follow-up implementation:

- W1, W2, W3, W4, W5, W6, W7
- V1, V2 rules 5/10/14, V3
- S1
- stale docs in `wallet-android/README.md`

Notes:

- The original V2 rule-6 finding is stale. Version 1 now intentionally allows
  a broad `{ "kind": "fhir.resources" }` selector to mean any patient-specific
  FHIR resources the wallet can offer and the user chooses to share.
- S2 was already fixed in `MainActivity.kt` before this issue file was checked
  in; the remaining stale carrier-key wording was in `wallet-android/README.md`.

## Wallet (wallet-android)

### W1. Response factory writes `fhirVersion` on every artifact (latent bug)

`wallet-android/.../SmartCheckinResponseFactory.kt:43`

```kotlin
.put("fhirVersion", artifact.fhirVersion)
```

Spec rule 10 (line 1128): `application/smart-health-card` artifacts SHALL NOT
carry an outer `fhirVersion`. Most generic artifacts also shouldn't.

Latent today because `DemoWalletStore.kt:17` hardcodes
`mediaType = "application/fhir+json"`. Fires the moment any other media type is
produced, and the verifier won't catch it (see V3).

**Fix**: gate the `put` on `mediaType == "application/fhir+json"` (and on
generic artifacts known to carry FHIR).

**Severity**: latent bug.

### W2. `requestId` falls back to a literal type discriminator

`SmartCheckinResponseFactory.kt:57`

```kotlin
.put("requestId", request.requestId.ifBlank { "smart-health-checkin-request" })
```

If the request has a blank/missing `id`, the response echoes the literal
discriminator string `"smart-health-checkin-request"`. The verifier validator
accepts any non-empty string, so this slips through, but it never
correlates back to anything.

**Fix**: reject malformed requests earlier (see W3); remove the fallback.

**Severity**: bug.

### W3. Wallet parser silently fixes spec violations

`wallet-android/.../SmartRequest.kt:19, 40, 42`

```kotlin
requestId = smartRequest.optString("id").ifBlank { "smart-health-checkin-request" },
...
val id = item.optString("id").ifBlank { "item-${i + 1}" }
...
val accept = stringList(item.optJSONArray("accept")).ifEmpty { listOf("application/fhir+json") }
```

Wallet invents request ids when missing, synthesizes per-item ids when missing,
defaults `accept` to FHIR JSON when empty. Spec rules 3, 4, and 5 say all
three SHALL be present. Silent papering means the verifier never learns about
its own bugs.

**Fix**: throw early when any required field is missing; surface a clean
error.

**Severity**: bug.

### W4. Substring-based selector → kind routing is fragile

`SmartRequest.kt:94-139`

```kotlin
val selector = buildString {
    append(id); append(' ')
    append(stringList(content.optJSONArray("profiles")).joinToString(" "))
    ...
}.lowercase()
return when {
    "coverage" in selector -> ...
    "insuranceplan" in selector || "sbc" in selector -> ...
    "patient" in selector || "clinical-history" in selector || "bundle" in selector || ...
}
```

Lowercases the request `id`, profiles, resource types, and `profilesFrom` into
one string and substring-searches for keywords like `"coverage"`,
`"insuranceplan"`, `"patient"`. Mis-routes:

- `id: "insurance-plan"` matches `"insuranceplan"` → routes Plan even when the
  actual profile is `C4DIC-Coverage`.
- Custom profiles containing a keyword substring mis-route.
- Acceptable for the demo fixture set; not for real verifier requests.

**Fix**: match on the actual `profiles[]` canonicals (and `profilesFrom`)
against a known mapping. Drop the substring trick.

**Severity**: bug for non-demo use; acceptable for current fixtures.

### W5. Questionnaire fetcher doesn't strip `|version` from canonicals

`SmartQuestionnaireFetcher.kt:65-67`

```kotlin
val url = URL(rawUrl)
require(url.protocol == "https" || url.protocol == "http") { ... }
```

Spec allows `canonical|version` (lines 266, 393). A versioned canonical like
`https://example.org/Questionnaire/x|1.2.3` will fail or fetch wrong because
`|1.2.3` becomes part of the URL path.

**Fix**: split on `|` before fetching; pass the version to the resolver if
needed (or drop it for simple HTTP GET).

**Severity**: bug, narrow trigger.

### W6. Wallet doesn't pick from `accept[]` in preference order

`SmartCheckinResponseFactory.kt:28-37`

`resolveArtifact` returns whatever the wallet has (always
`application/fhir+json` today). The factory then checks if that media type is
in `acceptedMediaTypes` and emits `unsupported` otherwise. It never asks
"which of these can I produce, in order?"

Today this can't fire because the wallet only produces one media type.
Becomes a limitation when SHC support lands (see W7).

**Severity**: nit / limitation.

### W7. No SHC artifact production path

`DemoWalletStore.kt:17, 62-74`

`SmartHealthWalletArtifact.mediaType` is hardcoded to
`"application/fhir+json"`. There is no code path that produces
`application/smart-health-card` with a `verifiableCredential` array.

Verifiers asking for SHC-only get `requestStatus: "unsupported"` — that's
spec-correct for a wallet that has no SHCs, but it means we can't exercise
the SHC artifact branch end-to-end. Blocks meaningful SHC testing.

**Fix**: see the companion sample-data gathering task. Need real SHC JWS
fixtures to seed `DemoWalletStore`, then dispatch on `acceptedMediaTypes`
in `resolveArtifact`.

**Severity**: feature gap; blocks SHC test coverage.

## Verifier (rp-web)

### V1. Stale error message after carrier-key rename

`rp-web/src/protocol/index.ts:1326`

```ts
return { present: true, json: "", valid: false, error: "smart_health_checkin is not a string" };
```

Carrier key is now `org.smarthealthit.checkin.request` (declared at
`index.ts:110`). Error message still names the old key.

**Fix**: replace with `"requestInfo['org.smarthealthit.checkin.request'] is not a string"` or pull
the constant in.

**Severity**: nit.

### V2. Validator missing several SHALL rules

`rp-web/src/protocol/index.ts:1112-1124, 1153-1210`

- **Rule 5** (`fulfills` references must be valid request item ids): not
  checked. `validateSmartCheckinResponse` doesn't take the request as input.
- **Rule 6** (`fhir.resources` SHALL have `profiles` or `profilesFrom`):
  validator at line 1112 accepts `{ kind: "fhir.resources" }` with neither.
- **Rule 10** (SHC artifacts SHALL NOT carry outer `fhirVersion`):
  `validateArtifact` at line 1213 doesn't reject stray `fhirVersion`. So
  W1 wouldn't be caught even if it fired.
- **Rule 12** (Bundle resources SHALL share artifact's `fhirVersion`): not
  checked. Out of scope for shape validation but worth flagging.
- **Rule 14** (`requestStatus` SHALL include one entry per request item):
  not enforced because validator has no request to compare against.

**Fix**: add `validateResponseAgainstRequest(req, resp)` that enforces 5 and
14. Tighten `validateContentSelector` for rule 6. Tighten `validateArtifact`
to reject stray `fhirVersion` on SHC.

**Severity**: bug for rules 5 and 14 (cross-reference is the whole point);
nit for 6/10/12.

### V3. Tests don't cover SHC, SHL, or generic artifact paths

`rp-web/src/protocol/index.test.ts:81-99, 379`

Shape-validator test only exercises `application/fhir+json`. The Android
round-trip test only opens an Android response which produces only FHIR JSON.
No positive test for SHC validation. No negative test for stray `fhirVersion`
on SHC. Issues W1 and V2 (rule 10) slip through.

**Fix**: positive SHC test, negative `fhirVersion-on-SHC` test, round-trip
test that runs the wallet's actual factory output through the validator.
Depends on real SHC fixtures (W7).

**Severity**: test gap.

## Spec (`../SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`)

### S1. Drop `application/smart-health-link` from the spec

Lines 80, 760-766, etc.

`shlink:/<base64u>` is an addressable pointer to data the wallet already has
(or could fetch from somewhere it controls). If the wallet can inline SHCs or
FHIR JSON, SHL is redundant — it's just one layer of indirection.

The only case SHL helps is "payload too big to inline", which we don't have
today. When/if we do, deal with it then; don't carry an artifact branch
nobody exercises.

**Fix**: strike `SmartHealthLinkArtifact`, the SHL entry from
`SmartHealthCheckinAcceptedMediaType`, and any surrounding §6 prose. Drop
related rules.

**Severity**: simplification.

### S2. Comment on the wallet handler is stale

`wallet-android/.../MainActivity.kt:162`

```kotlin
// ItemsRequest.requestInfo.smart_health_checkin, builds a SMART-request-shape
```

Old key in a comment.

**Severity**: nit.

## Suggested fix order

| # | Issue | Effort |
| - | ----- | ------ |
| 1 | S1 — drop SHL from spec | Trivial (delete lines) |
| 2 | W3, W2 — wallet rejects malformed requests | Low |
| 3 | V2 (rules 5, 14) — `validateResponseAgainstRequest` | Medium |
| 4 | V2 (rule 6) — reject empty `fhir.resources` | Trivial |
| 5 | V2 (rule 10) — reject stray `fhirVersion` on SHC | Trivial |
| 6 | V1, S2 — stale error / comment cleanup | Trivial |
| 7 | W1 — gate `fhirVersion` on FHIR JSON | Trivial |
| 8 | W5 — strip `\|version` before HTTP fetch | Trivial |
| 9 | W7 — real SHC fixtures + `resolveArtifact` dispatch (depends on companion sample-data task) | Medium |
| 10 | W6 — wallet picks from `accept[]` in preference order | Low (only meaningful with W7) |
| 11 | V3 — SHC + negative + round-trip tests | Medium (depends on W7) |
| 12 | W4 — replace substring routing with profile-canonical match | Medium |

## Companion task

A separate background task is gathering real SHC sample data (JWS strings,
issuer JWKs, decoded payloads) so W7 / V3 / S1-removal-vs-SHC-add can land
together. Output drops in `fixtures/sample-shc/`.
