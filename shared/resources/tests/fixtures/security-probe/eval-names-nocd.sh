#!/usr/bin/env bash
# The same deliberately WRONG script as eval-names.sh, WITHOUT `cd "$1"` — the
# qa-cycle.sh shape, which globs "$DIR"/* from wherever it is. A substitution it
# runs lands in the child's cwd, which is where `absent` must therefore look.
for f in "$1"/*; do
  eval ": $(basename "$f")" 2>/dev/null
done
printf '12\n'
