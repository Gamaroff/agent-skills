#!/usr/bin/env python3
"""Engages on its input AND writes a side effect into $HOME — the escape the
sandbox HOME exists to make visible. The Python twin of cli-writes-home.mjs
(task.215)."""
import os
import re
import sys

with open(os.path.join(os.path.expanduser("~"), "cli-probe-side-effect-py"), "w") as f:
    f.write("x")
host = sys.argv[sys.argv.index("--host") + 1] if "--host" in sys.argv else ""
sys.exit(0 if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) else 3)
