# Developer tools

This directory holds developer-only tooling that supports the checked-in
fixtures and Android/Web diagnostics, but is not part of the runtime app or
public static site.

| Path | Purpose |
| --- | --- |
| [`capture/`](capture/) | Browser and Android capture scripts for real Digital Credentials API runs. |
| [`fixtures-tool/`](fixtures-tool/) | Python pyMDOC-CBOR sidecar for fixture generation and byte-level validation. |
| [`matcher-c/`](matcher-c/) | Diagnostic always-match C WASM matcher used for Android Credential Manager troubleshooting. |
