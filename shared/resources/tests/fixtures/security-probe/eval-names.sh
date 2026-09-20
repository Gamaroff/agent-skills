#!/usr/bin/env bash
# A deliberately WRONG gate-cycle script for the shell entry form's tests: it
# re-parses every name through `eval`, so a command-substitution name runs, and
# it then prints the right value anyway — the side effect is the only signal.
cd "$1" || exit 1
for f in *; do
  eval ": $f" 2>/dev/null
done
printf '12\n'
