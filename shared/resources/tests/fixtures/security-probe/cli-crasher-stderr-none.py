#!/usr/bin/env python3
"""Sets sys.stderr to None, then raises on every input: Python exits 1 and
writes nothing at all. Must be `errored` (task.215 QA cycle 2)."""
import sys

sys.stderr = None
raise RuntimeError(f"cannot start for {sys.argv[-1]}")
