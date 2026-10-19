#!/usr/bin/env python3
"""A --host refuser (exit 0 for a bare host, 3 otherwise) that first forks a
daemon: it detaches, points stdin/stdout/stderr at /dev/null and outlives the
answer by a few seconds. The case ends when the script answers, not when the
daemon does (task.215 QA cycle 3, TASK-215-QA3-3)."""
import os
import re
import sys
import time

if os.fork() == 0:
    os.setsid()
    null = os.open(os.devnull, os.O_RDWR)
    for fd in (0, 1, 2):
        os.dup2(null, fd)
    time.sleep(4)
    os._exit(0)
argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    print(f"refused: {host!r} is not a bare host", file=sys.stderr)
    sys.exit(3)
print(host)
