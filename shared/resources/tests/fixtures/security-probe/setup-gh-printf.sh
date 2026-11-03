#!/usr/bin/env bash
# The control for setup-gh-split.sh (task.255): the same defect class, built a
# different way — the name comes out of a command substitution and is run through
# `command`. No `gh` token appears here either.
tool=$(printf '%s%s' g h)
command "$tool" auth status || true
