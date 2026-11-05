#!/usr/bin/env bash
# Fails before any input reaches a control: a usage error whatever the argument.
echo "usage: x --doc <p>" >&2
exit 2
