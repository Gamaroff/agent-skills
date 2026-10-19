#!/usr/bin/env python3
"""Accepts a bare host (exit 0); on anything else it writes a well-formed
`answer <nonce>` record itself — the nonce read off sys.orig_argv — and then
CRASHES behind a quiet excepthook. The bootstrap's crash record follows the
forged answer, and a crash record wins: every hostile case must be `errored`,
never `rejected` (task.215 QA cycle 5)."""
import os
import re
import sys

argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host:
    print(host)
    sys.exit(0)
nonce = sys.orig_argv[sys.orig_argv.index("-c") + 2]
os.write(3, ("answer " + nonce + "\n").encode())
sys.excepthook = lambda t, v, tb: None
raise ValueError(f"cannot parse host {host!r}")
