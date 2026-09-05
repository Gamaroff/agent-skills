# QA Report: Task 91 — cycle 2 (refute pass)

**Task**: [task.91.reconcile-tracker-resolution.md](./task.91.reconcile-tracker-resolution.md)
**Gate File**: [task.91.gate.2.reconcile-tracker-resolution.yml](./task.91.gate.2.reconcile-tracker-resolution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-05
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fixes are mostly real: four of five findings are fixed and I re-verified each by execution
rather than by reading the diff.

The fifth is not fixed, and the reason is a defect **in the fix itself**. Cycle 1 changed the subshell
to return the resolver's exit status and its `TRACKER` on two lines. Command substitution strips
trailing newlines — so when `TRACKER` is empty, the payload collapses to a single field and both halves
of the split return `"0"`. The installer then resolves the **literal string `"0"`** as a tracker.

That is a worse outcome than the bug it replaced. `"0"` matches no entry in either classification list,
so the platform filter keeps every skill and says nothing. TASK-91-005 was about a path that failed
*loudly with an unhelpful message*; it now fails *silently with a plausible-looking one*.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

**Re-review scope: unscoped** — the whole `origin/develop...HEAD` diff for the three executable files
(774 lines), not the files changed since gate 1.

This is the cycle-2 rule and it earned its keep here. A narrowed cycle-2 review reads only cycle 1's
repairs and never re-reads the original change with what cycle 1 learned. The finding below is in
cycle 1's repair, and it is only visible when you ask what the repair does in a state the original
finding never mentioned — an empty `TRACKER`.

Direct execution throughout, plus an adversarial refute-pass subagent over the same diff. Every finding
recorded here was reproduced by me before it reached the gate.

---

## Re-Review Context

| ID | Cycle-1 finding | Status | Evidence |
| --- | --- | --- | --- |
| TASK-91-001 | rc 2 conflates every resolver refusal | **FIXED** | `tracker: github` + `AGENT_SKILLS_ACCESS_VCS=read-only` → `rc=0 tracker=github`, warning on stderr naming `access.vcs` |
| TASK-91-002 | `.env` probe spellings | **FIXED** | 10 spellings re-run: `export` → jira; CRLF-empty → github; `""` → github; plus trailing-spaces-only, quoted-spaces, `export` without `=`, CRLF throughout, `MYJIRA_URL=` — all correct |
| TASK-91-003 | dry run used the installed resolver | **FIXED** | `_locate_resolver` now takes the tmpdir as `$1` and returns `origin<TAB>path`; dry run reports provenance when it is not `release` |
| TASK-91-004 | rc 3 printed an unfiltered count | **FIXED** | the count is skipped with a stated reason — but see TASK-91-007, it is untested |
| TASK-91-005 | empty resolution had no message | **NOT FIXED** | the message exists in source but its branch is **unreachable** — TASK-91-006 |

---

## New Findings This Cycle

- **[HIGH]** `scripts/setup-consumer.sh` — the rc/`TRACKER` payload collapses when `TRACKER` is empty;
  the installer resolves the literal string `"0"` as a tracker. → TASK-91-006
- **[MEDIUM]** `shared/resources/tests/…test.mjs` — the -004 and -005 fixes have zero coverage; -003 is
  only indirect. → TASK-91-007
- **[LOW]** `shared/resources/resolve-platform.sh` — a duplicated `JIRA_URL` in `.env` is graded
  first-match-wins, where a sourcing shell takes the last. → TASK-91-008

---

## TASK-91-006 in detail

The subshell:

```
source "$1" >/dev/null 2>&1
printf "%s\n%s" "$?" "${TRACKER:-}"
```

With a resolver that sources cleanly and sets nothing, that emits `"0\n"`. Command substitution strips
the trailing newline, so `_out` is `"0"` — **one field**. The caller's split:

```
_rc=${_out%%$'\n'*}     # no newline to cut at -> "0"
_t=${_out#*$'\n'}       # no newline to cut at -> "0"
```

Both are `"0"`. `[[ "$_rc" == "0" && -n "$_t" ]]` is therefore true, and the function returns `"0"`.

Reproduced end to end against a truncated resolver copy:

```
truncated resolver   -> rc=0 tracker=[0]     <- should be rc=2 with an error
early-return resolver -> rc=2 tracker=[]     <- correct
```

The second line is why this survived: an `rc=1` resolver collapses to `"1"`, which is neither `"0"` nor
a legal tracker, so it falls through to the correct branch. **Only the `rc=0` case is wrong**, and it is
the only one no test exercises.

**Why it matters more than its trigger suggests.** The trigger — a resolver copy that sources cleanly
and sets nothing — is exactly what an interrupted install leaves behind, which is the scenario
TASK-91-005 was filed about. `_locate_resolver` checks only readability, never that the file is a
resolver. And `"0"` is not rejected downstream: it matches no entry in `SKILLS_JIRA_ONLY` or
`SKILLS_GITHUB_ONLY`, so `_skill_excluded_for_tracker` excludes nothing and the filter keeps every
skill while reporting success.

**The general point.** Cycle 1 fixed a real HIGH by making the subshell return more information. The
mechanism it chose to carry that information — a newline inside a command substitution — is one the
shell is entitled to discard. The fix was correct in the state it was written for (a non-empty
`TRACKER`) and wrong in the one it was written *about*.

---

## Success Criteria — re-verified

All six functional criteria still hold. 16 config shapes re-run this cycle, install vs run:

`tracker: jira` · double-quoted · single-quoted · CRLF · `auto` · `.env`-only · `bitbucket` (both
refuse) · tab separator · map form · `access.tracker`-only · explicit `github` + stale `.env` · empty
`JIRA_URL=` · `export JIRA_URL=` · CRLF-empty · quoted-empty · lone unmatched quote — **all agree**.

**Code quality**: `npm run ci` green at **2441 tests, 0 failures** (exit 0) on commit `9bbd93fc`, which
is `HEAD`; the working tree carries only the implementation report, correctly excluded from that commit.
Not re-run this cycle because nothing in the code tree changed since — stated rather than implied.

**shellcheck**: `setup-consumer.sh` 1 finding vs baseline 1; `resolve-platform.sh` 20 vs baseline 20.
Zero new in both. An SC2016 introduced mid-fix was removed rather than suppressed.

---

## NFR Assessment

**Security — PASS.** `.env` is parsed, never sourced. The awk probe was attacked with a directory, an
empty value, mixed quotes, `export` without `=`, CRLF throughout, and a decoy key ending in `JIRA_URL`.
All graded correctly; none errored.

**Performance — PASS.** Unchanged.

**Reliability — FAIL.** TASK-91-006 converts a loud failure into a silent one on the exact path cycle 1
set out to improve.

**Maintainability — CONCERNS.** Three of five cycle-1 fixes shipped untested, and that is causally
linked to TASK-91-006 rather than merely coincident with it: no test ever executed the empty-`TRACKER`
path, so a shell subtlety that made the branch unreachable still produced a green suite.

---

## Claims attacked and NOT broken

Recording these so cycle 3 does not re-litigate them:

- The rc/`TRACKER` split **degrades safely when the subshell cannot run at all** — `_out` is empty, both
  fields are empty, and the function falls to rc 2.
- The awk probe is correct on every edge case tried, including a `.env` that is a directory.
- The new tests are **not vacuous**: `_locate_resolver` in a bare temp repo resolves to
  `…/scripts/../shared/resources/resolve-platform.sh`, so the tests exercise the real file under test.
- `hermeticEnv` scrubs `AGENT_SKILLS_ACCESS_VCS`, so the new non-tracker-refusal test sets it
  deliberately rather than inheriting it.
- The parity assertions are not trivially satisfied by both sides returning `<refused>` for different
  reasons — `resolveTracker` maps only rc 2 to `<refused>`, `runtimeTracker` maps any non-zero, and the
  one case where they legitimately differ (the non-tracker refusal) is asserted directly, not compared.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Rationale**: one HIGH (`top_issues` rule 1) plus a Reliability NFR of FAIL.

The cycle is converging on substance — four findings genuinely closed, the functional goal intact and
re-verified — but the one remaining defect was *introduced by the previous cycle*, which is the signal
the refute pass exists to produce. The fix is small and the test that would have caught it is smaller.

**Next Steps**: `/qa-fix` on TASK-91-006 and -007, then cycle 3.
