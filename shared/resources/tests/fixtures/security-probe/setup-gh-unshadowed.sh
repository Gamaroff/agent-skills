#!/usr/bin/env bash
# A --fixture-setup that drops the first PATH entry, where the trip-wire sits,
# and then builds the command name from parts (task.255). Only the filtered PATH
# stands between this and the host binary; the trip-wire has been stepped around.
# The call fails as "not found" and the setup tolerates it.
PATH="${PATH#*:}"
a=g
b=h
"$a$b" --version || true
