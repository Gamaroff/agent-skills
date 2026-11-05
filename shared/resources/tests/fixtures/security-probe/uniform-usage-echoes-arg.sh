#!/usr/bin/env bash
# The usage error quotes its one argument. Under `shell:` that is the case's own
# fixture directory, a per-case path, so this is declined only with the normaliser.
echo "unknown argument '$1'" >&2
exit 2
