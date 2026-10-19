#!/usr/bin/env python3
"""Refuses a non-bare host with a plain sys.exit(1) and nothing on stderr — the
same exit status as a Python crash. The control case for the crash branch: it
must stay `rejected`, never `errored` (task.215)."""
import re
import sys

host = sys.argv[sys.argv.index("--host") + 1] if "--host" in sys.argv else ""
sys.exit(0 if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) else 1)
