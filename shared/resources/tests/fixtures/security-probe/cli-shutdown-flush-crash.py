#!/usr/bin/env python3
"""Answers a bare host (exit 0). On anything else it prints the host and then
closes its own stdout, so the flush at interpreter shutdown fails: Python
prints `Exception ignored while flushing sys.stdout` and exits 120, after the
bootstrap wrote `answer`. Read as a refusal, every hostile case scored
`rejected`; it must be `errored` (task.215 QA cycle 6, TASK-215-QA6-1)."""
import os
import re
import sys

argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
print(host)
if not (re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host):
    os.close(1)
