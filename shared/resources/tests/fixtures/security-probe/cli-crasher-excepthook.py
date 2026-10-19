#!/usr/bin/env python3
"""Accepts a bare host (exit 0) and CRASHES on anything else, after replacing
sys.excepthook the way rich.traceback.install() and Typer do: the crash exits 1
and prints no traceback frame. Every hostile case must be `errored`, never
`rejected`, or this boundary reads as one that refuses (task.215 QA cycle 2,
TASK-215-QA2-1)."""
import re
import sys

argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host:
    print(host)
    sys.exit(0)
sys.excepthook = lambda t, v, tb: print(f"Error: {v}", file=sys.stderr)
raise ValueError(f"cannot parse host {host!r}")
