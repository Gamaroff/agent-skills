#!/usr/bin/env bash
# Test stand-in for develop-pipeline-on-precompact.test.sh: models ANOTHER hook run
# taking the PreCompact claim at an exact moment, which timing alone cannot hit
# (40 concurrent pairs never reached the window). Linked into a scenario bin dir
# under two names, it acts by the name it is called as:
#
#   mv  — the first rename of the claim directory itself (`mv <claim.d> <dest>`) first
#         rewrites its pid to THIEF_PID: the faster stealer has already taken the dead
#         claim over and re-claimed it, so this rename moves a FRESH claim. Every
#         other call, and every later one, is the real mv ($REAL_MV).
#   git — `commit` rewrites the pid in THIEF_CLAIM_DIR to THIEF_PID (another run now
#         holds the claim while this one is still pausing); every call exits 0, as the
#         suite's noop git shim does.
#
# THIEF_MARK names a file created on the first act, so each scenario fires once.
case "${0##*/}" in
  mv)
    if [ $# -eq 2 ] && [ "${1##*/}" = "develop-pipeline.precompact-claim.d" ] \
       && [ -n "${THIEF_PID:-}" ] && [ ! -e "$THIEF_MARK" ]; then
      printf '%s\n' "$THIEF_PID" > "$1/pid"
      : > "$THIEF_MARK"
    fi
    exec "$REAL_MV" "$@"
    ;;
  git)
    for a in "$@"; do
      if [ "$a" = "commit" ] && [ ! -e "$THIEF_MARK" ] && [ -d "$THIEF_CLAIM_DIR" ]; then
        printf '%s\n' "$THIEF_PID" > "$THIEF_CLAIM_DIR/pid"
        : > "$THIEF_MARK"
      fi
    done
    exit 0
    ;;
esac
echo "precompact-claim-thief: called as '${0##*/}' — expected mv or git" >&2
exit 2
