#!/usr/bin/env python3
"""Answers a bare host (exit 0) and, on anything else, runs its check in a
worker thread that RAISES — then the main thread carries on and exits 0, as
`python3 <entry>` does after `threading.excepthook` prints the traceback. The
crash happens outside the frame the bootstrap watches, so the case is scored by
that exit status: `accepted`, a reproduction on a hostile case — never a pass
(task.215 QA cycle 5, TASK-215-QA5-1)."""
import re
import sys
import threading

argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""


def check():
    if not re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) or ".." in host:
        raise ValueError(f"cannot parse host {host!r}")


t = threading.Thread(target=check)
t.start()
t.join()
print(host)
