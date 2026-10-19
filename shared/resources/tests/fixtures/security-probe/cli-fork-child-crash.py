#!/usr/bin/env python3
"""A --host refuser (exit 0 for a bare host, 3 otherwise) that first forks a
child which opens a file — the lowest free fd, 3 once the crash fd is closed —
and raises. The child's crash is not the script's answer: the parent's exit
status is, and nothing may be written into the child's file. Exit 7 means it
was (task.215 QA cycle 3, TASK-215-QA3-2)."""
import os
import re
import sys

pid = os.fork()
if pid == 0:
    log = open("worker.log", "w")
    raise RuntimeError("worker failed")
os.waitpid(pid, 0)
if os.path.getsize("worker.log") != 0:
    sys.exit(7)
argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    print(f"refused: {host!r} is not a bare host", file=sys.stderr)
    sys.exit(3)
print(host)
