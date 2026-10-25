#!/usr/bin/env bash
# A cleanup the task.232 change never mentions (the obs #176 control): deletes
# the directory named by $1, recursively, unless $1 is --dry-run. Prints ok.
case "$1" in
  --dry-run) ;;
  *) rm -rf -- "$1" ;;
esac
printf 'ok\n'
