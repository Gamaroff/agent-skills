#!/usr/bin/env python3
"""A CLI that reads a populated directory (task.216): `merge-back DIR` exits 0
only when DIR/items.json exists and carries the marker, or when the
PROBE_MARKER env var does; anything else is refused with exit 1. The Python
twin of cli-needs-data.mjs."""
import os
import sys

argv = sys.argv[1:]
if len(argv) != 2 or argv[0] != "merge-back":
    print("usage: cli-needs-data merge-back DIR", file=sys.stderr)
    sys.exit(2)
if os.environ.get("PROBE_MARKER") == "MARKER":
    print("ok (env)")
    sys.exit(0)
items = os.path.join(argv[1], "items.json")
if not os.path.isfile(items):
    print(f"no items.json in {argv[1]}", file=sys.stderr)
    sys.exit(1)
with open(items, encoding="utf-8") as f:
    if "MARKER" not in f.read():
        print(f"{items} carries no marker", file=sys.stderr)
        sys.exit(1)
print("ok")
