#!/usr/bin/env bash
# A side effect one level down: writes sub/marker in the case directory (its
# cwd) and prints ok. For the task.232 tests: a nested `expected.absent` must
# catch it on every form.
mkdir -p sub && : > sub/marker
printf 'ok\n'
