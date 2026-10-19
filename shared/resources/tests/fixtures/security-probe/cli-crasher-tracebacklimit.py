#!/usr/bin/env python3
"""Sets sys.tracebacklimit = 0, then raises on every input: stderr holds only
`KeyError: …`, no frame, which is what a refusal printing that line looks like.
Must be `errored` (task.215 QA cycle 2)."""
import sys

sys.tracebacklimit = 0
raise KeyError(f"no policy for {sys.argv[-1]}")
