# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 is the last gate in the budget. It re-reviewed the whole branch diff, because gate 4 reported a security-axis CONCERNS. Both gate 4 findings are closed. The independent reviewer found two further medium edge cases in the Step 4 guard; I reproduced the first and the reviewer ran the second.

**Overall Assessment**: CONCERNS (80/100)
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Re-review scope: unscoped (the prior gate's security axis was not PASS) — full `origin/develop...HEAD` diff, 1838 patch lines. One read-only Explore reviewer with the safety re-probe directive; it returned in 69 s (measured, `duration_ms`).

CI: not read against a matching head (the PR head is `91e2da1d`; the later commits are local and unpushed), so nothing is mapped.

## Re-Review Context

| Finding | Status |
| --- | --- |
| T268-QA-8 (pathspec magic interpreted) | ✅ FIXED — mutation-proven |
| T268-QA-9 (nonexistent path reads clean) | ✅ FIXED — mutation-proven |

## New Findings This Cycle

- **[medium]** `skills/qa-fix/SKILL.md:854` — the slot is substituted into a double-quoted assignment, so a command substitution in a path runs (reproduced) → single-quoted heredoc or refuse metacharacters (T268-QA-10).
- **[medium]** `skills/qa-fix/SKILL.md:861` — a path in a nested repository or behind a symlinked directory exists, lists nothing, and reads clean (reviewer-run) → refuse or document (T268-QA-11).

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 18 (0 escaped), from `task.268.qa.5.security.run.json`
- No shell-metacharacter or nested-repo case in the probe.

### Reliability — CONCERNS
### Performance — PASS
### Maintainability — PASS

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/qa-fix/SKILL.md:854` — command substitution in the slot value executes → T268-QA-10.
- [medium/high] `skills/qa-fix/SKILL.md:861` — nested repo / symlinked directory reads clean → T268-QA-11.

**Cleanups (2):**
- `tests/qa-fix-step4-guard.test.js:136` — the admitted cases use only ignored directories; no tracked, deleted-tracked or intent-to-add case; the no-repo test asserts only the outcome → advisory.
- `shared/resources/develop-pipeline-step-3-develop-loop.md:233` — gives the bare unguarded listing → advisory.

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file .claude/state/t268-cases5.json --repo-root . --record task.268.qa.5.security.run.json --json
bash -c 'C="tracked \"$(touch PWNED)\""'
```

## Criteria Evidence (recorded at `/finalise` run 2, 2026-11-07, against head `88359b01`)

Added after `/finalise` run 1 found the records for Functional #1 to #3 and Performance #4 missing. The gate above is unchanged.

### The eight rules (Functional #1) and their fixtures (Functional #2)

A fresh reader judged each rule from the text of `skills/qa-fix/SKILL.md` alone, with one shape that must fire and one control that must stay silent.

| Rule | Obs | `SKILL.md` line | Shape fires | Control silent | Note |
| --- | --- | --- | --- | --- | --- |
| Classifier-direction probe (Step 3.5) | #16 | 798 | yes | yes | control is a log-message wording fix; "boundary" is wide wording |
| Weakest-value probe (Step 3.5) | #18 | 818 | yes | yes | control adds no new requirement |
| Earlier-refusal probe (Step 3.5) | #20 | 819 | yes | yes | judgement: the reader traces which later tests cross the path |
| Pre-fix population search (Step 3.5) | #27 | 724 | yes | yes | control is a code-only bug with no document claim |
| Move 5, narrow the contract (Step 2.6) | #42 | 648 | yes | yes | needs "the task itself says" the input cannot decide |
| Stage new files before the gate (Step 4) | #56 | 834 | yes | yes | the block is the refusal branch; a tracked-only fix passes it |
| Move 6, extract to a script (Step 2.6) | #63 | 649 | yes | yes | needs two consecutive MEDIUMs on a fenced shell block |
| Owed-block check (Step 7) | #113 | 971 | yes | yes | see the fixture set below |

Result: 8 of 8 shapes fire, 8 of 8 controls silent. The Step 4 guard is also held by `tests/qa-fix-step4-guard.test.js` (6 tests, 4 mutants).

### Step 7 owed-block check (Functional #3)

The check warns, adds the block and posts, and never halts the cycle (`SKILL.md:983-987`; settled at gate 1, T268-QA-2). The criterion text was amended from "refused" to "warned" to match.

| Fixture | Outcome |
| --- | --- |
| F1 Step 2.6 applied, block absent | fires: names the block, adds it, then posts |
| F2 Step 2.6 applied, block present | silent |
| F3 Step 2.6 not applied, no block | silent |
| F4 Step 2.6 applied, `Move: waive — reason` | satisfied |
| F5 third strike passed in, no `Struck mechanism:` block | fires |
| F6 documentation fix, no `Probe:` block | fires |

Two soft spots the reader named, not defects: trigger (b) is the agent's own judgement, and a `Move: waive` line also satisfies the `Struck mechanism:` check.

### Suite wall time (Performance #4)

Five alternating `CI=true npm test` pairs in scratch worktrees (develop at `origin/develop`, branch at `88359b01`), all exit 0. Load average at the start of each run is the first figure of `/proc/loadavg`, the same figure `uptime` prints.

| Pair | develop (s) | load | branch (s) | load |
| --- | --- | --- | --- | --- |
| 1 | 162 | 0.30 | 160 | 3.90 |
| 2 | 159 | 4.19 | 160 | 5.03 |
| 3 | 160 | 4.06 | 168 | 3.95 |
| 4 | 165 | 4.57 | 161 | 3.92 |
| 5 | 160 | 4.48 | 160 | 4.34 |

Median develop 160 s, median branch 160 s: within 10% (0%). The load was 4 to 5 from pair 2 on (the suite itself drives most of it), and the two arms ran at the same load.

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: the QA budget (5 gates) is spent. T268-QA-10 and T268-QA-11 go to the task's Deferred Work; then the `/review-pr` exit gate.
