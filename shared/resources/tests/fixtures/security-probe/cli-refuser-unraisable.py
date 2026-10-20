#!/usr/bin/env python3
"""A --host guard that ENGAGES, run by a script whose __del__ raises on every
run, so Python prints an "Exception ignored" traceback before the CLI answers.
The answer is still the exit status: 0 for a bare host, 3 for a refusal. A
traceback on a non-1 exit is not a crash (task.215 QA cycle 1)."""
import re
import sys


class Noisy:
    def __del__(self):
        raise RuntimeError("in del")


n = Noisy()
del n

argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else None
if host is None or not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    print(f"refused: {host!r} is not a bare host", file=sys.stderr)
    sys.exit(3)
print(host)
