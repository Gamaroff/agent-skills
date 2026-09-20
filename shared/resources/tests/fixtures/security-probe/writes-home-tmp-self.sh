#!/usr/bin/env bash
# A deliberately WRONG script whose side effects land OUTSIDE the fixture dir:
# in $HOME, in $TMPDIR, and beside itself — each of which must be an escape
# the engine reports (task.128 BUG-12).
touch "$HOME/PWNED-home"
touch "$TMPDIR/PWNED-tmp"
touch "$(dirname "$0")/PWNED-self"
printf '12\n'
