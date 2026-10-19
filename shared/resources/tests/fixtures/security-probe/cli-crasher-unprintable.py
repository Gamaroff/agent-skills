#!/usr/bin/env python3
"""Accepts a bare host (exit 0) and CRASHES on anything else with an exception
whose str() itself raises, after replacing sys.excepthook with one that prints
nothing: exit 1, nothing on stderr. A crash marker built from the exception's
text was lost here and the crash scored as a refusal (task.215 QA cycle 3,
TASK-215-QA3-1). Every hostile case must be `errored`."""
import re
import sys


class UnprintableError(Exception):
    def __str__(self):
        raise RuntimeError("no text for this exception")


argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host:
    print(host)
    sys.exit(0)
sys.excepthook = lambda t, v, tb: None
raise UnprintableError()
