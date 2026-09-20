#!/usr/bin/env bash
# A target that EXECUTES each directory entry (the shape a hostile name run as
# a command produces) under `set -e`: a non-executable fixture file makes bash
# print `<this script>: line N: <entry>: Permission denied` and exit 126 —
# the target's own answer, which must be COMPARED, not declined as a launch
# failure (task.128 BUG-9).
set -e
for f in "$1"/*; do
  "$f"
done
printf '12\n'
