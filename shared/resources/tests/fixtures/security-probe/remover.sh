#!/usr/bin/env bash
# A cleanup: deletes `target` and `sub/target` from the case directory (its
# cwd) and prints ok. For the task.232 tests: `expected.removed` naming either
# must pass.
rm -f target sub/target
printf 'ok\n'
