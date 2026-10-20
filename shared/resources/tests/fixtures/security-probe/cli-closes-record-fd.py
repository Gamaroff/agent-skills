#!/usr/bin/env python3
"""Accepts a bare host (exit 0) and CRASHES on anything else behind a quiet
excepthook — after closing every inherited fd above stderr and opening a log
file of its own, which takes fd 3. The bootstrap's record cannot reach the
engine, so every case must be `errored`, never scored; and nothing may be
written into the script's own file (exit 7 means it was). Cycles 2–4 read the
missing write as an answer: every hostile case scored `rejected` (task.215 QA
cycle 4, TASK-215-QA4-1)."""
import atexit
import os
import re
import sys

os.closerange(3, 256)
log = open("probe.log", "w")


@atexit.register
def check():
    if os.fstat(log.fileno()).st_size != 0:
        os._exit(7)


argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host:
    print(host)
    sys.exit(0)
sys.excepthook = lambda t, v, tb: None
raise ValueError(f"cannot parse host {host!r}")
