#!/usr/bin/env bash
# The RED fixture for the shell-fn: entry form (task.136): a sourced library
# whose function prints every argument unfiltered. A label filter that behaves
# like this has no control at all, and the probe must score it `absent`.
# Source it, then: echo_all ARG...
echo_all() {
  printf '%s\n' "$@"
}
