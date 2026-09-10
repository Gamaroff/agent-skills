# QA Report: Task 91 — cycle 4 (confirmation)

**Task**: [task.91.reconcile-tracker-resolution.md](./task.91.reconcile-tracker-resolution.md)
**Gate File**: [task.91.gate.4.reconcile-tracker-resolution.yml](./task.91.gate.4.reconcile-tracker-resolution.yml)
**Review Date**: 2026-09-05
**Gate Status**: PASS — 95/100

---

## Executive Summary

All ten findings raised across gates 1–3 are fixed and re-verified by execution. **Zero new findings.**
The task's goal is met and independently confirmed: 17 config shapes resolve identically at install time
and run time, including the three the task was filed to close.

**Deployment Recommendation**: APPROVED

---

## Re-Review Context — every finding, re-executed

| ID | Finding | Status | Evidence this cycle |
| --- | --- | --- | --- |
| 001 | rc 2 conflated every resolver refusal | ✅ FIXED | `tracker: github` + `AGENT_SKILLS_ACCESS_VCS=read-only` → `rc=0 [github]` |
| 002 | `.env` probe spellings | ✅ FIXED | 12 spellings correct, incl. `export`, CRLF-empty, `""` |
| 003 | dry run used the installed resolver | ✅ FIXED | locator takes the tmpdir; `release` origin now pinned by its own test |
| 004 | rc 3 printed an unfiltered count | ✅ FIXED | count skipped with a stated reason |
| 005 | empty resolution had no message | ✅ FIXED | `rc=2`, names the file |
| 006 | rc/`TRACKER` payload collapse → `"0"` | ✅ FIXED | truncated resolver → `rc=2 []` |
| 007 | cycle-1 fixes untested | ✅ FIXED | 61 tests, up from 40 |
| 008 | `.env` first-match vs last-match | ✅ FIXED | set-then-emptied → github |
| 009 | unvalidated tracker from a resolver | ✅ FIXED | planted `TRACKER=bitbucket` → `rc=2 []` |
| 010 | silent non-zero failure, no message | ✅ FIXED | planted `return 1` → `rc=2`, explanation emitted |
| BUG-6 | pre-identity refusal blamed the wrong file | ✅ FIXED | stderr names `SKILLS_CONFIG_FILE=/tmp/nope.yaml` |

**Positive control**: a planted resolver that *does* set `TRACKER=jira` returns `rc=0 [jira]`. Without
it the five negative results above would be consistent with a locator that simply never finds a planted
resolver — the tests would pass for the wrong reason.

---

## New Findings This Cycle

**None.** Scope: the cycle-3 diff (the legal-set validation and the stderr capture), plus a full
re-execution of every prior finding and the 17-shape divergence harness.

---

## Convergence

| Gate | HIGH | MEDIUM | LOW | Decision |
| --- | --- | --- | --- | --- |
| 1 | 1 | 4 | 5 | FAIL (70) |
| 2 | 1 | 1 | 1 | FAIL (70) |
| 3 | 0 | 1 | 1 | CONCERNS (80) |
| 4 | **0** | **0** | **0** | **PASS (95)** |

The gate-2 HIGH was **not** the gate-1 HIGH unresolved — it was a new defect introduced by the gate-1
fix, which is precisely what the cycle-2 refute pass exists to surface. No file carried a HIGH into a
third consecutive gate, so the third-strike rule never fired.

---

## What this loop actually cost, and what it bought

Three fix cycles is more than a task this size should need, and the reason is worth recording rather
than smoothing over: **the first two cycles shipped fixes that no test executed.** Cycle 1's fix for the
empty-`TRACKER` case was unreachable and the suite stayed green. Cycle 2 found it only because the
refute pass asks what a fix does in a state the original finding never mentioned.

The gap behind all of it was in the fixture, not the code: `makeFixtureTarball` shipped no resolver, so
every install test resolved through this repo's own checkout. The `release` origin — the copy a real
consumer actually installs with — was exercised by nothing. That is now closed and pinned.

**A green suite was never evidence here.** Every finding in this loop was found by running the code
against a hostile input, and every fix was mutation-proven by reverting the specific behaviour.

---

## Success Criteria

All six functional criteria met, re-verified this cycle. Code quality: `npm run ci` green at **2450
tests, 0 failures**; `shellcheck` 1 finding vs baseline 1 on `setup-consumer.sh` and 20 vs 20 on
`resolve-platform.sh`, 0 new in both; every behaviour change mutation-proven; `npm run bundle` re-run.
Migration: the CHANGELOG names the affected shape and the one-line opt-out.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

Five points withheld for the cleanups carried forward untouched — the double-source on the failure path,
two comments still describing the deleted local parser, and the two remaining mirrored decisions
(`_config_skills_profile`'s awk YAML parsing, and the skill lists duplicated in
`resolve-skill-set-cli.mjs`). None blocks this change; the last is the obvious next task, since it is
the same pattern this one removed for `tracker:`.

**Next Steps**: Step 5c `/review-pr`, then finalise.
