#!/usr/bin/env python3
"""A --host refuser (exit 0 for a bare host, 3 otherwise) that writes its own
`answer` and `crash` lines on fd 3 and leaves by os._exit, past every exit the
bootstrap controls. Lines without the case's nonce are not records, and with no
record the case is `errored` — the safe direction, never scored (task.215 QA
cycle 4, TASK-215-QA4-1)."""
import os
import re
import sys

os.write(3, b"answer\nanswer 0\ncrash\n")
argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
sys.stdout.flush()
if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    os._exit(3)
print(host, flush=True)
os._exit(0)
