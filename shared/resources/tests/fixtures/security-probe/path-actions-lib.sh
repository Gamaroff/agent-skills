# shellcheck shell=bash
# A sourced library for the shell-fn form's task.232 tests. `path_action ACTION`
# does in its cwd (the case directory) what the shell: fixtures of the same
# name do, then prints ok. The shell-fn form writes no file for its input, so
# `remove` deletes a sink control rather than the input.
path_action() {
  case "$1" in
    nested-write) mkdir -p sub && : > sub/marker ;;
    remove) rm -f -- '~.gate.12.control.yml' ;;
    keep) ;;
    symlink-out) ln -s / out ;;
  esac
  printf 'ok\n'
}
