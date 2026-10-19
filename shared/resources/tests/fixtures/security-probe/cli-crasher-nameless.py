#!/usr/bin/env python3
"""Accepts a bare host (exit 0) and CRASHES on anything else with an exception
whose class name cannot be read (its metaclass raises on __name__), after
replacing sys.excepthook with one that prints nothing: exit 1, nothing on
stderr, and no Class: message to report. The crash must still be `errored`
(task.215 QA cycle 3, TASK-215-QA3-1)."""
import re
import sys


class Nameless(type):
    @property
    def __name__(cls):
        raise RuntimeError("no name for this class")


class NamelessError(Exception, metaclass=Nameless):
    pass


argv = sys.argv[1:]
host = argv[argv.index("--host") + 1] if "--host" in argv and argv.index("--host") + 1 < len(argv) else ""
if re.fullmatch(r"[a-z0-9.-]+(:[0-9]+)?", host, re.I) and ".." not in host:
    print(host)
    sys.exit(0)
sys.excepthook = lambda t, v, tb: None
raise NamelessError()
