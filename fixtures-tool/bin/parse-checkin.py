#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fixtures_tool.checkin import expected_walk, parse_document


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a SMART Check-in mdoc fixture.")
    parser.add_argument("document", type=Path, help="Path to document.cbor.")
    parser.add_argument("--out", type=Path, help="Optional JSON output path.")
    args = parser.parse_args()

    walk = expected_walk(parse_document(args.document.read_bytes()))
    text = json.dumps(walk, indent=2, sort_keys=True) + "\n"
    if args.out:
        args.out.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
