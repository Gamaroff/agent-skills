#!/usr/bin/env python3
"""Exits 0 only when run as `python3 -E -s -B` and NOT `-I`: the interpreter
flags the cli: form promises for a .py entry (task.215). Prints the flags it
saw on stderr when they are wrong, so a failing test says which one."""
import sys

f = sys.flags
ok = f.ignore_environment and f.no_user_site and f.dont_write_bytecode and not f.isolated
if not ok:
    print(f"flags: E={f.ignore_environment} s={f.no_user_site} B={f.dont_write_bytecode} I={f.isolated}", file=sys.stderr)
sys.exit(0 if ok else 4)
