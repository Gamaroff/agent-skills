# QA Report: Task 292 - One bash tokenizer for the QA snippet classifier (cycle 3)

**Task**: [Link to task document](./task.292.qa-snippet-classifier-one-bash-tokenizer.md)
**Gate File**: [task.292.gate.3.qa-snippet-classifier-one-bash-tokenizer.yml](./task.292.gate.3.qa-snippet-classifier-one-bash-tokenizer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Testing Completed**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

Both earlier HIGH findings are fixed and verified, and bugs 1 and 2 are closed. The unscoped safety re-probe found three more shapes the classifier calls runnable while bash writes. They are three faces of one cause, indirect evaluation: bash re-evaluates quoted text as an array subscript, a prompt string or arithmetic. All three give the same verdict on `develop`, appear nowhere in the tracked corpus, and sit in areas the task lists as out of scope (the command-level allow-list, and full bash parsing). They are recorded as pre-existing follow-ups, not blockers. Security is CONCERNS because known holes remain open.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (371/371 under `CI=true`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#869)

### Review Methodology

Whole-branch diff (`origin/develop...HEAD`, 10474 lines, head `7ec74b57`), unscoped because gate 2 failed on security (safety re-probe). One read-only Explore reviewer, dispatched 05:45Z, returned in 102 s (`duration_ms` 102319). It ran about 245 probe blocks against real bash in a scratch directory.

Diff review: code review.
Step 4b: not applicable — no runnable prose in the change set.
CI on 7ec74b57107f: pending (read once, not waited on).

Re-review scope: unscoped (prior gate failed on security).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T292-QA-1 (`<<` as heredoc in `$[ ]`, `(( ))`, subscript) | FIXED, closed in cycle 2 | Arith differential seeds 41 and 61: 0 writes |
| T292-QA-2 (arithmetic regex erased a nested substitution) | FIXED | Seven shapes classify `mutating`; removing `refuseArithSubst` turns 8 tests red (re-run by QA, restored `cmp` clean); arith seed 61 (60000 blocks) 0 writes. Bug 2 closed. |

## New Findings This Cycle

Three findings, all `pre-existing` under the provenance rule (not in `top_issues[]`, routed to `recommendations.future`):

- **[high/high, pre-existing]** `shared/resources/qa-execute-snippets.mjs:3247` — `assignmentHazard` only sets `startupHazard`, which is read only for helper-function calls, so `printf -v` with a quoted `a[$(touch W)]` name, and the same for `read`, `test -v`, `[[ -v ]]`, `unset` and `[[ … -eq ]]`, is runnable and writes (T292-CR-1).
- **[high/high, pre-existing]** `shared/resources/qa-execute-snippets.mjs:3142` — PS4 is not a startup-variable hazard on the direct path and `${x@P}` expands prompt escapes: `PS4='$(touch W)'; set -x; echo hi` and `x='$(touch W)'; echo ${x@P}` are runnable and write (T292-CR-2).
- **[high/high, pre-existing]** `shared/resources/qa-execute-snippets.mjs:3205` — data bash later re-evaluates as arithmetic is read as inert text: `x='a[$(touch W)]'; echo $((x))`, `[[ $x -eq 1 ]]`, `${x:0:$x}` and `${!x}` are runnable and write (T292-CR-3).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1–4 | PASS | Verified | Unchanged since gate 2 except the cycle 2 fix |

**Overall Phase Completion**: 4/4

## Issues Found

### HIGH Severity Issues (0)

None attributed to this change. See the Code Review section for three pre-existing high findings.

### MEDIUM Severity Issues (0)
None.

### LOW Severity Issues (0)
None.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
The reviewer timed eight repeated constructs up to N=32000: near-linear, no throws out of `classifyBlock`. The slice test took 3.36 s against its 10 s bound.

### Reliability — PASS
Unmodelled shapes throw and `classifyFailClosed` returns `mutating`.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 31 (`shell-exec` sink, entry `isRunnableBlock`, record `task.292.qa.3.security.run.json`: 31 executed, 0 reproduced, 0 escaped)
- The lexical class this task owns is clean: differential `arith` seed 61 (60000 blocks) and all six sets seed 62 (30000 each) show 0 writes. The reviewer's 245 probes found 22 runnable-and-writing blocks, all in the three pre-existing classes below.

### Maintainability — PASS
The `WORD` and assignment regexes remain a documented follow-up.

---

## Code Review

**Correctness bugs (3, all pre-existing):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3247` — printf -v and other operand-evaluating builtins with a quoted subscript → set the hazard on the direct path.
- [high/high] `shared/resources/qa-execute-snippets.mjs:3142` — PS4 and `${x@P}` → add PS-variables and the `@P` operator as hazards.
- [high/high] `shared/resources/qa-execute-snippets.mjs:3205` — quoted data re-evaluated as arithmetic → refuse a quoted literal holding `$(` or a backtick when assigned to a variable.

Reproduction (scratch directory, each run under real bash, 12 shapes): every one classifies `runnable` and writes `W`. Controls: `x='a b'; echo $x`, `PS4='+ '; set -x; echo hi` and `x='[1]'; echo $((1))` are clean (the first and third `runnable`); `printf -v y '%s' x; echo $y` is `placeholder`. Provenance (5b): the `develop` engine gives the same verdict for all 12 shapes. Corpus scan of tracked Markdown for `printf -v` with a subscript or substitution, `PS4=`, `${x@P}`, `unset '`, `test -v`, `[[ -v` and a quoted `$(` assigned then used in arithmetic: zero hits (one prose mention of `PS4=` in a task.191 QA report).

Scope check (5b): the task's out-of-scope list excludes the command-level allow-list ("task.289's work, unchanged") and "full bash parsing (arithmetic, …)". The three findings are semantic re-evaluation of correctly lexed text, not lexical misreads, so they are not the defect class this task names. Contrast bug 2, which was a regex copy hiding text from the scan, and stayed in scope. Not downgraded: the reviewer's rating (high/high) is recorded unchanged. The owner may reclassify them as in scope; the fix cycle would then be one sweep of the class, not three patches.

**Cleanups (0):** none.

mutation-proven: refuseArithSubst call removed → 8 tests (seven `T292-QA-2` rows, tokenizer row) → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Engine suite, `CI=true` | PASS 371/371 |
| Differential `arith`, seed 61, 60000 blocks | PASS 0 writes |
| Differential all six sets, seed 62, 30000 each | PASS 0 writes |
| Docs scan | PASS 3446 blocks, runnable 257 → 256, 0 newly runnable, 1 newly refused (task.45 bug 1, line 76) |

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node scripts/qa-snippets-differential.mjs --atoms arith --count 60000 --seed 61
command node scripts/qa-snippets-differential.mjs --atoms all --count 30000 --seed 62
command node scripts/qa-snippets-docscan.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record task.292.qa.3.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. File one task for the indirect-evaluation class (T292-CR-1 to CR-3): `printf -v` and its kin with a quoted subscript, PS4 and `${x@P}`, and quoted data re-evaluated as arithmetic. The classifier says `runnable` for all of them today, on `develop` as well.
2. Decide whether to move the `WORD` and assignment regexes onto tokens.

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the task's own defect class is closed and held by instruments; known pre-existing holes outside its scope remain.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the owner accepts the three pre-existing holes and files the follow-up.
**Next Steps**: review-pr (5c), then finalise.
