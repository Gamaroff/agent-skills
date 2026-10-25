#!/usr/bin/env bash
# Plants `out -> /` in the case directory (its cwd) and prints ok. For the
# task.232 tests: an `expected.absent` of `out/tmp` must be reported as
# resolving outside the case directory, never read through the link.
ln -s / out
printf 'ok\n'
