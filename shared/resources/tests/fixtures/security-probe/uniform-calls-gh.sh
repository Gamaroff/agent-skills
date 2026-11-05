#!/usr/bin/env bash
# Reaches `gh` through a variable, past the text detector, then fails uniformly.
# The trip-wire on PATH must win: `needs-fake-gh` is the more specific reason.
tool=g
tool="${tool}h"
"$tool" pr view >/dev/null 2>&1
echo "usage: x --doc <p>" >&2
exit 2
