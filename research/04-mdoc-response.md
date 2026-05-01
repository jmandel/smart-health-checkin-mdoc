# Building an mdoc DeviceResponse for our use case

Source: ISO/IEC 18013-5:2021 §8 (Documents/MSO), §9 (DeviceAuth), and inferences from
`google/mdoc-credential` for the COSE shapes used in DC-API contexts.

## Top-level structure

```
DeviceResponse = {
    "version":   tstr,           ; "1.0"
    "documents": [+ Document],
    "status":    uint            ; 0 = OK
}
```

CBOR major-type-5 map. We always send exactly one document.

## Document

```
Document = {
    "docType":      tstr,        ; "org.smarthealthit.checkin"
    "issuerSigned": IssuerSigned,
    "deviceSigned": DeviceSigned
}
```

Both `issuerSigned` and `deviceSigned` are required by the spec — even if our
`deviceSigned.nameSpaces` is empty.

## IssuerSigned

```
IssuerSigned = {
    "nameSpaces": IssuerNameSpaces,
    "issuerAuth": COSE_Sign1     ; the MSO
}

IssuerNameSpaces = {
    + NameSpace => [ + IssuerSignedItemBytes ]
}

IssuerSignedItemBytes = #6.24(bstr .cbor IssuerSignedItem)
                        ; tag 24 wraps a *bytes* item that itself contains CBOR

IssuerSignedItem = {
    "digestID":         uint,
    "random":           bstr,        ; ≥ 16 bytes, unpredictable per item
    "elementIdentifier": tstr,       ; e.g. "fhir:profile:..."
    "elementValue":      any         ; we use tstr containing JSON
}
```

Critical detail: the `valueDigests` map in the MSO must contain the SHA-256 of
**the exact CBOR bytes of `IssuerSignedItemBytes`** — i.e., the wrapped tag-24
encoding, not the inner item alone. Encode once, hash those bytes, include them by
reference into the MSO before signing.

## MobileSecurityObject (MSO)

```
MSO = #6.24(bstr .cbor {
    "version":         tstr,         ; "1.0"
    "digestAlgorithm": tstr,         ; "SHA-256"
    "valueDigests": {
        + NameSpace => { + uint => bstr }   ; digestID -> hash(IssuerSignedItemBytes)
    },
    "deviceKeyInfo": {
        "deviceKey": COSE_Key
        ; (optional) "keyAuthorizations", "keyInfo"
    },
    "docType":      tstr,
    "validityInfo": {
        "signed":     tdate,
        "validFrom":  tdate,
        "validUntil": tdate
        ; (optional) "expectedUpdate"
    }
})
```

Wrapped (again) in tag 24 when used as the COSE_Sign1 payload.

## issuerAuth (COSE_Sign1, self-signed)

```
issuerAuth = COSE_Sign1 [
    protected:   bstr .cbor { 1: -7 },              ; ES256
    unprotected: { 33: [ + bstr ] },                ; x5chain — our self-cert(s)
    payload:     bstr .cbor MSO_with_tag24,
    signature:   bstr
]
```

- Generate one P-256 key in Android Keystore (StrongBox if available), produce a
  minimal self-signed X.509 cert, persist it. Reuse forever; nothing trusts it
  anyway.
- Sign-input is the standard COSE_Sign1 Sig_structure:
  `["Signature1", protected, external_aad=bstr(0), payload]` CBOR-encoded.

## DeviceSigned + DeviceAuth

```
DeviceSigned = {
    "nameSpaces": DeviceNameSpacesBytes,            ; #6.24(bstr .cbor {})  for empty
    "deviceAuth": { "deviceSignature": COSE_Sign1 } ; or "deviceMac"
}
```

For DC-API there's no shared session key, so use `deviceSignature`:

```
deviceSignature payload = #6.24(bstr .cbor [
    "DeviceAuthentication",
    SessionTranscript,
    DocType,
    DeviceNameSpacesBytes
])
```

Sign with the **device key** (the same key embedded in `MSO.deviceKeyInfo.deviceKey`).
Same key serves both roles in our self-attesting model — IRL these would be
different (issuer key signs MSO; device key, bound by MSO, signs DeviceAuth). For us,
nothing checks separation, so collapsing simplifies key management. If we want to be
slightly more spec-correct, generate two keys — easy enough.

## elementValue choices

Comparison for our FHIR-JSON payloads:

| Option | Pros | Cons |
| ------ | ---- | ---- |
| `tstr` containing JSON | one-line encode, decode is trivial | not "true" CBOR |
| CBOR-encoded JSON-equivalent map | "native" CBOR | bigger, no consumer benefits |
| `bstr` containing UTF-8 JSON | distinguishes from incidental text | weirder for verifiers |

**Lean: `tstr` of JSON.** A verifier that doesn't recognize our namespace round-trips
it as an opaque string; one that does parses with `JSON.parse`.

## CBOR canonicalization

mdoc requires deterministic encoding (RFC 8949 §4.2.1). Practically:
- map keys sorted (length-then-bytewise; CBOR core deterministic)
- shortest-form lengths
- no indefinite-length items

Pick a CBOR library that supports this (Java/Kotlin: `nimbus-jose-jwt`'s CBOR is not
suitable; `co.nstant.in:cbor` works, or `androidx.identity-credential` ships a
deterministic encoder). Confirm before M3.
