#!/usr/bin/env bash
# undefined-command-guard.test.sh — regression tests for undefined-command-guard.sh
#
# Usage: bash shared/resources/undefined-command-guard.test.sh
#
# Each scenario runs in a child bash that sources the guard, calls something, then runs
# undefined_commands_check, so the guard's verdict is read from the outside. Pins:
#   • a suite that calls only defined commands passes, and its record file is removed
#   • a miss at top level, inside $(...), inside `if` and after `||` is caught and named
#   • repeated misses are counted per call and named once
#   • a script the suite runs does not inherit the hook

PASS=0
FAIL=0
HERE="$(cd "$(dirname "$0")" && pwd)"
GUARD="$HERE/undefined-command-guard.sh"
# shellcheck source=undefined-command-guard.sh
. "$HERE/undefined-command-guard.sh"

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# scenario NAME BODY — runs BODY after sourcing the guard, then the check. Sets OUT (stdout+stderr),
# RC (the check's status) and LEFT (record files left in the scenario's TMPDIR).
scenario() {
  local dir="$T/$1"; mkdir -p "$dir"
  OUT=$(TMPDIR="$dir" bash -c '. "$1"; eval "$2"; undefined_commands_check' _ "$GUARD" "$2" 2>&1); RC=$?
  LEFT=$(find "$dir" -name 'undefined-commands.*' | grep -c .)
}

echo "undefined-command-guard.sh"

if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  echo "  SKIP  bash ${BASH_VERSION} never calls command_not_found_handle — the guard is off here"
  echo "Results: $PASS passed, $FAIL failed"
  exit 0
fi

scenario clean 'helper() { :; }; helper; true; X=$(printf ok)'
[ "$RC" -eq 0 ] && [ "$LEFT" -eq 0 ] && ! printf '%s' "$OUT" | grep -q FAIL \
  && pass "only defined commands → check returns 0, record file removed" || fail "clean" "rc=$RC left=$LEFT out=$OUT"

scenario top 'no_such_helper_top arg'
[ "$RC" -eq 1 ] && printf '%s' "$OUT" | grep -q '1 call(s) to an undefined command: no_such_helper_top' && [ "$LEFT" -eq 0 ] \
  && pass "a top-level miss → check returns 1 and names it" || fail "top" "rc=$RC left=$LEFT out=$OUT"

scenario subst 'X=$(no_such_helper_subst)'
[ "$RC" -eq 1 ] && printf '%s' "$OUT" | grep -q 'no_such_helper_subst' \
  && pass "a miss inside \$(...) is caught (the subshell writes to the shared file)" || fail "subst" "rc=$RC out=$OUT"

scenario cond 'if no_such_helper_if; then :; fi; no_such_helper_or || true'
[ "$RC" -eq 1 ] && printf '%s' "$OUT" | grep -q '2 call(s)' && printf '%s' "$OUT" | grep -q 'no_such_helper_if no_such_helper_or' \
  && pass "misses inside if and before || are caught — the ones set -e lets through" || fail "cond" "rc=$RC out=$OUT"

scenario repeat 'no_such_helper_rep; no_such_helper_rep; no_such_helper_rep'
[ "$RC" -eq 1 ] && printf '%s' "$OUT" | grep -q '3 call(s) to an undefined command: no_such_helper_rep $' \
  && pass "three calls to one missing name → counted 3, named once" || fail "repeat" "rc=$RC out=$OUT"

scenario seterr 'set -euo pipefail; if no_such_helper_strict; then :; fi'
[ "$RC" -eq 1 ] && printf '%s' "$OUT" | grep -q 'no_such_helper_strict' \
  && pass "works under set -euo pipefail (a jira fixture suite's mode)" || fail "seterr" "rc=$RC out=$OUT"

printf '#!/usr/bin/env bash\nno_such_helper_child 2>/dev/null\nexit 0\n' > "$T/child.sh"
scenario child "bash '$T/child.sh'"
[ "$RC" -eq 0 ] \
  && pass "a script the suite runs does not inherit the hook (its misses are its own)" || fail "child" "rc=$RC out=$OUT"

undefined_commands_check || FAIL=$((FAIL + 1))
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
