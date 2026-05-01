#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$VENDOR_DIR/_src"

usage() {
  cat >&2 <<'EOF'
Usage: bash vendor/scripts/run-reference-checks.sh <source>

Sources:
  multipaz      Run focused Multipaz JVM tests for direct DC API, DeviceResponse, and HPKE.
  pymdoc-cbor   Run pyMDOC-CBOR tests in a local virtualenv.
  auth0-mdl     Run @auth0/mdl tests.
EOF
}

require_source() {
  local id="$1"
  if [[ ! -d "$SRC_DIR/$id/.git" ]]; then
    echo "Missing vendor/_src/$id. Run: bash vendor/scripts/fetch.sh" >&2
    exit 1
  fi
}

source_id="${1:-}"
case "$source_id" in
  multipaz)
    require_source multipaz
    cd "$SRC_DIR/multipaz"
    ./gradlew -Pdisable.web.targets=true :multipaz:jvmTest \
      --tests 'org.multipaz.presentment.DigitalCredentialsPresentmentTest' \
      --tests 'org.multipaz.mdoc.response.DeviceResponseGeneratorTest' \
      --tests 'org.multipaz.crypto.HpkeTests'
    ;;
  pymdoc-cbor)
    require_source pymdoc-cbor
    cd "$SRC_DIR/pymdoc-cbor"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    python -m pip install --upgrade pip
    python -m pip install -e '.[test]' || python -m pip install -e .
    python -m pip install pytest
    python -m pytest
    ;;
  auth0-mdl)
    require_source auth0-mdl
    cd "$SRC_DIR/auth0-mdl"
    npm ci --ignore-scripts
    npm test
    ;;
  *)
    usage
    exit 2
    ;;
esac
