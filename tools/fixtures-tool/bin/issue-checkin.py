#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fixtures_tool.checkin import load_input, write_fixture


def main() -> None:
    parser = argparse.ArgumentParser(description="Issue a pyMDOC-CBOR SMART Check-in fixture.")
    parser.add_argument("--input", type=Path, help="Input JSON. Uses a built-in minimal fixture when omitted.")
    parser.add_argument("--out", type=Path, required=True, help="Output fixture directory.")
    parser.add_argument("--force", action="store_true", help="Replace output directory if it exists.")
    args = parser.parse_args()

    manifest = write_fixture(args.out, load_input(args.input), force=args.force)
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
