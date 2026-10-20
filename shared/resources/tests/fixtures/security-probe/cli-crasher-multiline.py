#!/usr/bin/env python3
"""Raises an uncaught exception whose message spans two lines, and an atexit
handler then writes one more stderr line. The traceback's last line is neither
the exception nor anything exception-shaped. Exits 1. Must be `errored`
(task.215 QA cycle 1, TASK-215-QA1-1)."""
import atexit
import sys

atexit.register(lambda: print("cleanup done, bye", file=sys.stderr))
raise ValueError(f"cannot start: no policy for {sys.argv[-1]}\nsee docs at https://example.invalid/policy")
