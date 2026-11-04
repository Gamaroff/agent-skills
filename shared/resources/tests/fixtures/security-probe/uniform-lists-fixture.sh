#!/usr/bin/env bash
# Same exit on every case, but stderr shows what each case held: the inputs
# arrived, so this is not a uniform failure.
ls -a "$1" >&2
exit 2
