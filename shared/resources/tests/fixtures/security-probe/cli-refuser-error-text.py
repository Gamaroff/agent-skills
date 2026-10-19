#!/usr/bin/env python3
"""Refuses a non-bare host by printing a line that LOOKS like an exception
(`ValueError: …`) and exiting 1 — but with no traceback frame. A refusal, not a
crash: the crash branch needs a `File "…", line N` frame as well (task.215)."""
import re
import sys

host = sys.argv[sys.argv.index("--host") + 1] if "--host" in sys.argv else ""
if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I):
    print(f"ValueError: refused host {host!r}", file=sys.stderr)
    sys.exit(1)
