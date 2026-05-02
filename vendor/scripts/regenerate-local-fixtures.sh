#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for tools/fixtures-tool" >&2
  exit 1
fi

echo "==> pyMDOC-CBOR grounding fixtures"
cd "$PROJECT_DIR/tools/fixtures-tool"
uv sync --dev
if ! uv run pytest --version >/dev/null 2>&1; then
  uv sync --dev --reinstall
fi
uv run pytest
uv run python bin/issue-checkin.py \
  --out ../../fixtures/responses/pymdoc-minimal \
  --force
uv run python bin/parse-checkin.py \
  ../../fixtures/responses/pymdoc-minimal/document.cbor \
  --out ../../fixtures/responses/pymdoc-minimal/expected-walk.json

if command -v bun >/dev/null 2>&1; then
  echo "==> RP protocol tests"
  cd "$PROJECT_DIR/rp-web"
  bun scripts/generate-dcapi-request-fixtures.ts
  bun test
else
  echo "bun not found; skipped rp-web tests" >&2
fi
