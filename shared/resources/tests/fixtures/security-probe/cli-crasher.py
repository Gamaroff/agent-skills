#!/usr/bin/env python3
"""Raises an uncaught exception on every input: Python prints a traceback and
exits 1, the status a refusal exits with. Must be `errored` (task.215)."""
import sys


def load_policy(path):
    raise RuntimeError(f"cannot start: no policy at {path}")


load_policy(sys.argv[-1])
