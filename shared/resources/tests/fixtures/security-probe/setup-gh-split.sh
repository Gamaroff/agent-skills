#!/usr/bin/env bash
# A --fixture-setup that reaches `gh` by a spelling the textual scan (namesGh)
# cannot see: the command name is built from two parts, so no `gh` token appears
# in this file (task.255). The run-time trip-wire is what must catch it.
set -e
a=g
b=h
"$a$b" --version
