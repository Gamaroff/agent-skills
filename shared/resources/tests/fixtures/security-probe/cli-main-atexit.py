#!/usr/bin/env python3
"""A --host refuser (exit 0 for a bare host, 3 otherwise) whose atexit handler
reads __main__ after the body has returned: under `python3 <path>` it is still
this script's module, so the handler finds REFUSE_EXIT. Exit 8 means __main__
was swapped back after the body (task.215 QA cycle 3, TASK-215-QA3-4)."""
import atexit
import os
import re
import sys

REFUSE_EXIT = 3


def check_main():
    if getattr(sys.modules["__main__"], "REFUSE_EXIT", None) != REFUSE_EXIT:
        os._exit(8)


atexit.register(check_main)
argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    print(f"refused: {host!r} is not a bare host", file=sys.stderr)
    sys.exit(REFUSE_EXIT)
print(host)
