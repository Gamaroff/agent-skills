#!/usr/bin/env python3
"""A --host guard behind `if __name__ == "__main__":` that also checks it was
run as itself: sys.argv[0] is this file. Exit 0 for a bare host, 3 for a
refusal, 9 when sys.argv is not what `python3 <path> --mode strict …` gives
(task.215 QA cycle 2)."""
import os
import re
import sys


def main():
    # argv is exactly what `python3 <path> --mode strict …` gives: this file,
    # then the flags, nothing in between.
    if os.path.basename(sys.argv[0]) != "cli-main-guard.py" or sys.argv[1:3] != ["--mode", "strict"]:
        sys.exit(9)
    argv = sys.argv[1:]
    host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
    if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
        print(f"refused: {host!r} is not a bare host", file=sys.stderr)
        sys.exit(3)
    print(host)


if __name__ == "__main__":
    main()
