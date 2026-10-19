#!/usr/bin/env python3
"""A multi-flag Python CLI whose --host guard ENGAGES: a bare host[:port] is
printed and exits 0, anything else is refused with exit 3 and a one-line
message on stderr. The Python twin of cli-refuser.mjs (task.215)."""
import re
import sys

argv = sys.argv[1:]


def val(flag):
    return argv[argv.index(flag) + 1] if flag in argv and argv.index(flag) + 1 < len(argv) else None


host = val("--host")
if val("--mode") != "strict":
    print("usage: cli-refuser.py --mode strict --host <host>", file=sys.stderr)
    sys.exit(2)
if host is None or not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
    print(f"refused: {host!r} is not a bare host", file=sys.stderr)
    sys.exit(3)
print(host)
