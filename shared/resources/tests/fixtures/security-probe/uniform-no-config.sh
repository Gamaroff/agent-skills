#!/usr/bin/env bash
# The control case: a uniform failure in other words and with another exit, so a
# pass cannot mean the usage example was recognised by its text.
echo "cannot find config" >&2
exit 1
