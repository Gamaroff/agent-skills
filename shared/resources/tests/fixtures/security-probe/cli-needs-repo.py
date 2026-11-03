#!/usr/bin/env python3
"""A CLI that reads repository state (task.254): `check DIR` exits 0 only when
its cwd is inside a git work tree that holds a commit, and refuses anything
else with exit 1. The Python twin of cli-needs-repo.mjs."""
import subprocess
import sys

argv = sys.argv[1:]
if len(argv) != 2 or argv[0] != "check":
    print("usage: cli-needs-repo check DIR", file=sys.stderr)
    sys.exit(2)


if argv[1].startswith("-"):
    # The guard under probe: a DIR that reads as a flag is refused whatever the
    # repository holds, so a hostile case is rejected even when one exists.
    print(f"refusing {argv[1]}: reads as a flag", file=sys.stderr)
    sys.exit(1)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).returncode


if git("rev-parse", "--is-inside-work-tree") != 0:
    print("not a git repository", file=sys.stderr)
    sys.exit(1)
if git("rev-parse", "--verify", "HEAD") != 0:
    print("no commit", file=sys.stderr)
    sys.exit(1)
print("ok")
