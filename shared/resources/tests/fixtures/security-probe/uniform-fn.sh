#!/usr/bin/env bash
# A library for the shell-fn: form: the function fails before reading its input.
uniform_fn() {
  echo "usage: uniform_fn --doc <p>" >&2
  return 2
}
