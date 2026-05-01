#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$VENDOR_DIR/_src"

mkdir -p "$SRC_DIR"

fetch_source() {
  local id="$1"
  local url="$2"
  local commit="$3"
  local dest="$SRC_DIR/$id"

  if [[ ! -d "$dest/.git" ]]; then
    echo "==> cloning $id"
    git clone --no-checkout "$url" "$dest"
  else
    echo "==> updating $id"
  fi

  git -C "$dest" fetch --depth=1 origin "$commit"
  git -C "$dest" checkout --detach FETCH_HEAD
  git -C "$dest" rev-parse HEAD > "$dest/.vendor-ref"
  echo "    checked out $(cat "$dest/.vendor-ref")"
}

fetch_source \
  "multipaz" \
  "https://github.com/openwallet-foundation/multipaz.git" \
  "4b2e75139d9e7add9cc3821676ab6cf5b79df3af"

fetch_source \
  "pymdoc-cbor" \
  "https://github.com/IdentityPython/pyMDOC-CBOR.git" \
  "22198bb95cf8d35feb1671d04dbd0164ed713de5"

fetch_source \
  "auth0-mdl" \
  "https://github.com/auth0-lab/mdl.git" \
  "5cc139cfbcbc3d96c982efb0e7ea9f1b8027ffbf"

fetch_source \
  "google-mdoc-credential" \
  "https://github.com/google/mdoc-credential.git" \
  "84180d83aaa7ea9f1fe1b3f836cbb17b7d95cb98"

echo "Fetched vendor references into $SRC_DIR"
