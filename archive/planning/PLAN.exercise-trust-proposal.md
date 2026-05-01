# Plan: exercise every trust slot end-to-end (debug-policy "yes")

## Goals

The current demo runs correctly **without** any cert chain validation, reader
authentication, or stable identity. That's expedient for a demo, but it leaves
half the protocol's machinery unexercised: data structures get encoded with no
matching decode, code paths exist on paper but have never carried a byte, and
"swapping in real PKI later" is not the one-line change we keep saying it is.

This plan replaces "skip trust" with "perform every trust check, but always
say yes." The wire becomes byte-identical to a CA-rooted production
deployment; the only thing that distinguishes us is a flag in the trust policy
that says "accept anything." That flag becomes the single seam where a future
maintainer adds a real anchor list and is otherwise running an end-to-end
trust pipeline.

Concrete outcomes:

- Every signature/cert/handshake slot defined by the protocol is **filled
  with bytes that pass mathematical verification** on the receiving side.
- Each side **maintains a stable identity** (cert + key) instead of generating
  ephemeral ones per call. Identity is bootstrapped at first run and persisted.
- Each side has a **typed `Trust` decision per slot** (`NotProvided` /
  `SignatureBad` / `UntrustedSelfSigned` / `Anchored`) plumbed from the
  bytes-decoder layer up to the UI surface.
- Each side ships an **anchor list** — empty today, plus a "accept any"
  policy override. The empty list + the override is the hot-swap point.
- Both UIs surface the trust state: verifier shows "wallet identity:
  *self-signed CN=… (debug-trust)*"; wallet shows "verifier identity:
  *self-signed CN=… (debug-trust)*".
- Test fixtures cross-check that the bytes round-trip both ways.

## Non-goals

- **No PKI deployment.** No root CAs, no VICAL, no OpenID Federation, no SHC
  trust list. We're exercising the slots — populating them with self-signed
  data — not deploying a trust hierarchy.
- **No hardware attestation.** The wallet's identity will live in Android
  Keystore (StrongBox if available) but we won't gate on attestation. That's
  a follow-on task.
- **No origin-allowlist roll-out.** A separate concern; touched only briefly
  here.
- **No replay-detection database.** A stable device key makes it *possible*,
  but we're not building the verifier-side state required.

## Trust slots — current vs. target

| # | Slot | Today | Target |
| --- | --- | --- | --- |
| 1 | `issuerAuth` COSE_Sign1 (wallet → verifier) | Wallet emits with **ephemeral** self-signed cert per response. Verifier verifies signature math; never validates chain. | Wallet emits with **stable** self-signed cert from Android Keystore. Verifier verifies signature math AND walks chain through a `policy.acceptIssuer(chain) -> Trust` hook. Default policy = always-accept. |
| 2 | `deviceSignature` COSE_Sign1 (wallet → verifier) | Wallet signs with **ephemeral** key generated per response. Verifier verifies with key from MSO. Already correct. | Wallet signs with **stable** device key from Keystore. Verifier behavior unchanged. |
| 3 | `DocRequest.readerAuth` COSE_Sign1 (verifier → wallet) | **Not emitted, not checked.** | Verifier emits with stable self-signed reader cert (rp-web localStorage-persisted key + cert). Wallet verifies signature math AND walks chain through `policy.acceptReader(chain) -> Trust` hook. Default policy = always-accept. |
| 4 | HPKE `EncryptionInfo.recipientPublicKey` (verifier → wallet) | Ephemeral per call; intentionally so (forward secrecy). | **No change** — this is supposed to be ephemeral. |
| 5 | HPKE `enc` (wallet → verifier) | Ephemeral per response; intentionally so. | **No change.** |
| 6 | `callingAppInfo.getOrigin(privAppsJson)` | Pass `"{}"` → always null → fallback. | **Out of scope for this plan**, but the place where we display "verifier origin" gets a third option in the typed `OriginTrust` enum: `OriginAttested` if a future allowlist is wired. |
| 7 | Verifier-side issuer trust list | Hard-coded empty. | A list (loaded from `rp-web/src/policy/trusted-issuer-roots.json`, possibly empty). The policy hook checks the chain against this list; if empty, applies the always-accept fallback. |
| 8 | Wallet-side reader trust list | Hard-coded empty. | A list (loaded from `wallet-android/app/src/main/assets/trusted-reader-roots.json`, possibly empty). Same pattern. |

## Design sketch

### Shared trust-decision model

Both sides have a small enum and a typed result for each signed-or-cert-bearing
artifact they receive. Implementations diverge but the conceptual shape is the
same:

```
sealed enum class Trust {
  NotProvided                                       // slot was empty in the bytes
  SignatureBad(reason: String)                      // crypto verify failed
  UntrustedSelfSigned(subject: String)              // chain length 1, no match against anchors
  ChainBroken(reason: String)                       // chain present but doesn't form a chain
  Anchored(subject: String, root: String)           // chain terminates at a configured root
  AcceptedByDebugPolicy(subject: String, reason: String)  // policy override fired
}
```

This is what threads through both sides. The UI consumes it directly. Tests
assert against it. Future work hooks new policies into the *same* enum.

### Trust policy

A pluggable function:

```
policy: (chain: List<X509Certificate>) -> Trust
```

For the demo, the policy is:

```kotlin
fun debugAcceptAll(chain: List<X509Certificate>): Trust {
    if (chain.isEmpty()) return Trust.NotProvided
    val leaf = chain.first()
    // First try a real anchor walk:
    val rootMatch = chain.last().issuerDN
    if (rootMatch in trustedRoots) {
        return Trust.Anchored(leaf.subjectDN.toString(), rootMatch.toString())
    }
    // Otherwise accept by debug policy with full provenance.
    return Trust.AcceptedByDebugPolicy(
        subject = leaf.subjectDN.toString(),
        reason = "self-signed; debug policy = accept-any",
    )
}
```

Production hardening = swap that `AcceptedByDebugPolicy` branch for a
rejection; the rest stays.

### Stable identities

Both sides bootstrap a long-lived identity on first run:

| Side | Where | Lifetime |
| --- | --- | --- |
| Verifier (rp-web) | `localStorage["smart-checkin-reader-key"]` (raw P-256 PKCS8 base64url) + `…-cert` (DER base64url). Generated once on first page load. | Browser-storage lifetime (clear on cache wipe). |
| Wallet (Android) issuer | Android Keystore alias `smart-checkin-issuer-v1` (P-256, signing). Cert in app-private storage. Generated once on first registration. | Until app data wiped. |
| Wallet (Android) device | Android Keystore alias `smart-checkin-device-v1` (P-256, signing). Cert in app-private storage. Generated once. | Until app data wiped. |

These identities aren't exposed publicly anywhere — they're just stable
reference points that survive across requests so the verifier and wallet UIs
can do "you've shared with this verifier 4 times" / "this is the same wallet
as last time" UX over a longer horizon, even without trust anchors.

## Verifier (rp-web) changes

### New files

- `rp-web/src/policy/trusted-issuer-roots.json` — empty array `{ "roots": [] }` to start.
- `rp-web/src/protocol/x509.ts` — small ASN.1 DER builder + parser (~250 LOC). Already partially needed by the wallet pattern; mirror that work in TS.
- `rp-web/src/protocol/reader-identity.ts` — boot-time bootstrap of the persistent reader key + cert.
- `rp-web/src/protocol/trust.ts` — `Trust` discriminated union + `evaluateChain` policy function.

### Touched files

- `rp-web/src/protocol/index.ts`
  - `buildOrgIsoMdocRequest` becomes async: load reader identity, build `readerAuth` COSE_Sign1 over each `DocRequest`, embed in the `DocRequest` map.
  - New helper `buildReaderAuth({sessionTranscript, itemsRequestBytes, readerKey, readerCert})` mirroring `signCoseSign1`.
  - `openWalletResponse` extends its return value with `issuerTrust: Trust` derived from walking `issuerAuth.x5chain` through the policy.
- `rp-web/src/App.tsx` — render `issuerTrust` next to the existing protocol/digest pills. Color: green for `Anchored`, amber for `UntrustedSelfSigned` / `AcceptedByDebugPolicy`, red for `SignatureBad` / `ChainBroken`.

### Wire shape diff

```
DocRequest = {
  "itemsRequest": #6.24(bstr .cbor ItemsRequest),
+ "readerAuth":   COSE_Sign1[
+                   protected:    bstr .cbor { 1: -7 },
+                   unprotected:  { 33: [<reader DER cert>] },
+                   payload:      cbor.tag24([
+                                   "ReaderAuthentication",
+                                   sessionTranscriptBytes,
+                                   #6.24(bstr .cbor ItemsRequest),
+                                 ]),
+                   signature:    raw ECDSA P-256 SHA-256
+                 ]
}
```

`SessionTranscript` calculation does not change — it's still the
`["dcapi", sha256(handoverInfo)]` layout. Reader auth signs **over** the
transcript bytes, not affecting them.

## Wallet (Android) changes

### New files

- `wallet-android/app/src/main/assets/trusted-reader-roots.json` — `{ "roots": [] }` to start.
- `wallet-android/app/src/main/java/.../WalletIdentity.kt` — bootstrap + accessor for the persistent issuer + device keys (Keystore-backed) and their certs.
- `wallet-android/app/src/main/java/.../Trust.kt` — sealed class mirroring the verifier's discriminated union.
- `wallet-android/app/src/main/java/.../ReaderAuthVerifier.kt` — COSE_Sign1 verify over `cbor.tag24(["ReaderAuthentication", sessionTranscript, itemsRequestBytes])`, plus the chain-policy hook.

### Touched files

- `SmartHealthMdocResponder.kt` — replaces `generateP256KeyPair(random)` calls for issuer + device keys with `WalletIdentity.issuerKey()` / `deviceKey()`. The certs in `issuerAuth.x5chain` and the `deviceKey` COSE_Key inside MSO come from the same persistent identity. **MSO `validityInfo`** stays per-response (signed/validFrom/validUntil), but the signing key is stable.
- `DirectMdocRequestParser.kt` — when parsing the inner ItemsRequest map, also peek at the surrounding DocRequest for an optional `readerAuth` field. If present, build a `ReaderAuthDecoded`. Pass through to `DirectMdocRequest.readerTrust: Trust`.
- `HandlerActivity.kt` — invoke `ReaderAuthVerifier.verify(directMdocRequest)` and stash the result in `directMdocRequest.readerTrust`. Pass to consent UI.
- `SmartRequest.kt` (`SmartRequestAdapter.build`) — pipe the `readerTrust` through into `VerifiedRequest.readerTrust`.
- `MainActivity.kt` Compose consent surface — render the `Trust` outcome alongside the verifier origin: "Verifier: `https://clinic.example` (origin attested by browser) · *self-signed CN=clinic.example demo verifier (debug-trust)*."

### Wire shape diff

The wallet's response wire bytes don't gain a new field — it already had
`issuerAuth` and `deviceSignature` and the only change is *which key signs
them*. So the bytes change but the schema doesn't.

## Matcher considerations

The WASM matcher is fully unaffected. Reader auth and trust policy live above
the eligibility decision; the matcher still byte-searches the doctype. No new
imports, no size impact, no diff. The matcher's protocol identity remains
"present an entry; the handler does the heavy lifting."

## Persistence + bootstrap

### First-run flow (verifier)

```
1. Page loads.
2. localStorage.getItem("smart-checkin-reader-key") → null
3. crypto.subtle.generateKey(ECDSA P-256, extractable=true)
4. selfSignReaderCert(publicKey, privateKey, subject="CN=rp-web demo verifier")
5. localStorage.setItem the PKCS8 + DER (both base64url)
6. Use the loaded key/cert for every subsequent request build.
```

UI gives the user a "Reset reader identity" button for testing.

### First-run flow (wallet)

```
1. App boots. Registration.kt calls WalletIdentity.bootstrap(context).
2. Keystore lookup for "smart-checkin-issuer-v1" → not found.
3. KeyPairGenerator.getInstance("EC", "AndroidKeyStore") with the
   appropriate KeyGenParameterSpec (P-256, signing-only, no biometric gate
   for the demo, StrongBox if isStrongBoxBacked).
4. self-sign cert. Persist DER to filesDir.
5. Same for "smart-checkin-device-v1".
6. Subsequent calls into WalletIdentity return the already-bootstrapped
   handles.
```

UI shows the issuer + device subject DNs in a developer panel; one button to
"reset wallet identity" for testing (deletes + regenerates).

## Test plan

### Unit tests

- `wallet-android/.../ReaderAuthVerifierTest.kt` — verify against TS-built
  fixtures; assert `Trust.AcceptedByDebugPolicy` for self-signed roots,
  `Trust.SignatureBad` if the bytes are tampered, `Trust.NotProvided` if the
  field is absent.
- `rp-web/src/protocol/reader-auth.test.ts` — symmetric: build a
  `readerAuth`, verify it round-trips through a fixture-stored signing key.
- `rp-web/src/protocol/issuer-trust.test.ts` — feed in a wallet-built
  `issuerAuth` fixture, assert `Trust.AcceptedByDebugPolicy`.

### Cross-impl test vectors

Add to `wallet-android/app/src/test/resources/test-vectors.json` (the file the
TS generator already produces):

- `readerAuthVectors[]` — for each request vector, a self-signed reader cert
  + private key + the resulting `DocRequest.readerAuth` COSE_Sign1 hex. The
  Kotlin test asserts byte-for-byte agreement with TS output.
- `issuerAuthVectors[]` — similarly, a wallet-built `issuerAuth` fixture
  produced by Kotlin and consumed by TS to ensure both sides agree on the
  Sig_structure canonicalization.

### End-to-end smoke

- Add a `verifier-trust-bundle` panel to the wallet's debug-bundle output:
  `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth.diag`,
  `reader-trust.json` (the typed `Trust` outcome), and the cert DER.
- Wire the explainer (`explainer-claude.html`) to render those new files in a
  new live region §5.5 "Reader auth trust outcome."

### Negative tests

- Tamper the reader cert → `Trust.SignatureBad`.
- Provide a chain of length 2 where the leaf isn't signed by the second cert
  → `Trust.ChainBroken`.
- Provide a self-signed leaf with a subject that already matches a configured
  trusted root → `Trust.Anchored`.
- Empty trust list + leaf only → `Trust.AcceptedByDebugPolicy`.

## Phasing

| Phase | Scope | Deliverable |
| --- | --- | --- |
| 0 | Plumbing both sides | `Trust` types, policy hooks, `NotProvided` everywhere, no wire-byte change. Tests for the type plumbing. |
| 1 | Stable wallet identity | `WalletIdentity.kt` + Keystore-backed issuer + device keys. Cert subject DN visible in the debug bundle. Wire bytes change because the certs now match across calls. |
| 2 | Stable verifier identity | `reader-identity.ts` + localStorage-persisted reader key/cert. Visible in the rp-web tool surface. |
| 3 | Reader auth on the wire | rp-web emits `readerAuth`; wallet verifies + assigns `Trust.AcceptedByDebugPolicy`. Cross-impl test vectors land. |
| 4 | Trust UI both sides | Consent screen shows wallet-side `Trust` for the verifier; rp-web result panel shows verifier-side `Trust` for the wallet. Color-coded. |
| 5 | Anchored case | Add a "self-anchor" mode where each side seeds its trust list from its own self-signed cert at boot. Now the same identity round-trips as `Trust.Anchored` rather than `Trust.AcceptedByDebugPolicy`. Useful for proving the chain-walk works without a real CA. |
| 6 | Wire reader-trust into the explainer | New live region in `explainer-claude.html` for `reader-auth.cbor`, plus a §19 doc section walking the COSE_Sign1 bytes. |

Phases 0–3 are the must-do core; 4–6 are polish.

## Risks / open questions

- **Browser key storage.** The verifier's reader key in `localStorage` is
  unencrypted. Acceptable for a demo, but worth a banner that says so. A
  follow-on improvement is to bind it to a backend that signs on demand.
- **Keystore on emulators.** AndroidKeystore generally works on emulators,
  but StrongBox-backed keys do not. The bootstrap should fall back gracefully
  (try StrongBox; on failure, fall back to TEE; on failure, fall back to
  software). Not a blocker — the cert produced is the same shape regardless.
- **Cert content beyond the basics.** Real reader certs have AAMVA-defined
  extensions (key usage, EKU, etc.). For a self-signed demo we omit those;
  if a future reviewer asks "why don't you set X.509 BasicConstraints" the
  honest answer is "we'll add it when we have a real CA."
- **Schema impact on `MSO.validityInfo`.** A stable issuer key with
  per-response `validityInfo` is fine, but the question becomes "what does
  validity even mean?" For a wallet that re-issues per response, it's a
  sliding window. We keep it (tooling expects it) but document that it's
  cosmetic until a real issuance event exists.
- **Replay protection.** Stable device key makes it possible for a malicious
  party to record one response and try to replay it elsewhere. Today,
  `SessionTranscript` already binds responses to (origin, encryptionInfo),
  so replay across sessions fails. The new risk surface is replay within the
  same session if a wallet emits multiple responses — currently impossible
  because the handler emits one response and finishes. Worth a code comment.
- **Reader trust list provisioning.** Today the file is empty and the policy
  always accepts. When the SMART verifier CA materialises, we need to decide
  the deployment model: bundle in the APK, fetch on first run, fetch on
  every boot, etc. This plan deliberately avoids that decision. The empty
  file + always-accept policy is the holding pattern.

## Single-line summary of what changes

Self-signed reader auth on the request, persistent self-signed wallet identity
on the response, typed `Trust` decisions threaded both ways, accept-any policy
in the trust hook for now — same wire shape as a CA-rooted production
deployment, swap-the-policy at the end is the only thing standing between
this and real PKI.
