#!/usr/bin/env bash
# server-lib.sh — sourced by run.sh. Defines the reachability and toolchain probe for the LAN
# test server. No `set -e` and no top-level `exit`: a sourced file that exits takes its caller
# down with it.

# server_ready HOST TOOL...
#
# One SSH round trip. Returns 0 when HOST answers and every TOOL resolves on its PATH, and
# `docker` can talk to its daemon; non-zero otherwise. BatchMode makes a missing key fail at once
# instead of prompting, and ConnectTimeout bounds an unreachable host (a closed port otherwise
# waits out the kernel's own timeout).
server_ready() {
  local host="$1"
  shift
  local probe="" tool
  for tool in "$@"; do
    probe+="command -v ${tool} >/dev/null 2>&1 && "
  done
  probe+="docker version >/dev/null 2>&1"
  ssh -o ConnectTimeout=6 -o BatchMode=yes "$host" "$probe"
}
