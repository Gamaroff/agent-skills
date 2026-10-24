# QA Report: Task 227 - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Task**: [Link to task document](./task.227.step-8-checklist-no-rm.md)
**Gate File**: [task.227.gate.3.step-8-checklist-no-rm.yml](./task.227.gate.3.step-8-checklist-no-rm.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 3 re-reviewed the 28 files changed since gate 2's head (`8d21d218..b479f628`). All four cycle-2 findings are fixed, and the three code fixes are mutation-proven in a clean worktree. The review found that cycle 2 made `--complete` stricter than the Step 8 check that guards it: the two now disagree about a hold directory that cannot be listed (MEDIUM). It also found that an unreadable hold-dir record is deleted silently (LOW). Both reproduce.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-227-QA2-1: held-paths is deleted while the hold-dir record is kept | low | ✅ FIXED | Scenario 15 asserts both records in the full and unlistable cases (84/84). Mutation f1 (held-paths back in the unconditional `rm`) turns the 4 keep cases red |
| TASK-227-QA2-2: an unlistable hold dir reads as empty | low | ✅ FIXED in `--complete` | Unlistable case per arm. Mutation f2 (ignore `ls`'s exit status) turns both unlistable cases red. Step 8's own check was not changed, which is QA3-1 |
| TASK-227-QA2-3: `rm>` / `rm<` accepted | low | ✅ FIXED | `RM_WORD = /(?<![\w-])rm(?![\w-])/`; control test has `rm>/dev/null a`, `rm<<EOF` and `rm 2>/dev/null a`. Mutation f3 (cycle-1 lookahead back) turns it red. Probe: `engages`, 20 cases |
| TASK-227-QA2-4: stale task wording | low | ✅ FIXED | §3, §4, §5 and criteria 1–2 state the exception |

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-8-commit.md:276` — QA3-1: Step 8's hold-dir check passes an unlistable directory that `--complete` then keeps the records for, and the comments at `:288` say this cannot happen (CR-1). → State the rule once and have both read it. Bug report 3.
- **[low]** `shared/resources/advance-pipeline-lock.sh:187` — QA3-2: a hold-dir record that exists but cannot be read is deleted silently, along with held-paths (CR-2). → Treat it as pending in the same rule.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#746, OPEN, head `b479f628`)

### Testing Approach

- [x] Automated Testing (lock suite, checklist suite, `npm run ci:fast`)
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review (narrowed)

### Review Methodology

Direct tools, as for a re-review. The one subagent was the Step 3b diff reviewer.

Re-review scope: narrowed to the 28 files changed since gate 2's head `8d21d218` (an ancestor of HEAD), showing their full diff against the base (2230 patch lines). SAFETY_REPROBE=false (clause 1 false).

Diff reviewer: one read-only Explore subagent, prompt from `code-review-prompt.md`. Dispatched 08:12:39Z; completion notice `duration_ms` 886679 (about 15 min, over the 10-minute budget, but it completed and its output was used). Both anchors are `ok` (`finding-anchors.js`, `--rev HEAD`).

Mutation proofs ran in a detached worktree at `b479f628`, after confirming both suites were green there. The worktree was clean afterwards and was removed.

Step 4b: not re-run. This cycle changed only comment lines in the Step 8 block. The committed `executed against fixtures` suite runs the block with the template bound (62/62).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | Scenario 15 now has four hold cases per arm |
| Phase 2: Move the removals | CONCERNS | Verified | QA3-1 and QA3-2 are on the hold-record keep rule |
| Phase 3: Docs and bundle | PASS | Verified | Exception wording is consistent across header, usage, Step 8, CHANGELOG and the task; bundle clean |

**Overall Phase Completion**: 3/3 delivered, 1 with findings

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| `--complete` with a lock removes the five records and the lock | PASS | Lock-arm case; the exception is now stated in the criterion |
| No-lock `--complete` removes the same records, exits 0 | PASS | No-lock-arm case |
| An unrelated file survives | PASS | Both arms |
| The checklist block has no `rm`, and the guard fails if one is added | PASS | Guard test; the matcher now refuses redirection forms |
| `npm run ci` passes | PASS (local) | `ci:fast` 6289/0 twice on the final tree. The full `npm run ci` runs at the develop-next merge gate |
| `bundle:check` clean, no `UNREACHED` | PASS | `npm run bundle` clean after the cycle-2 fix |
| Report records both Phase 2 mutations | PASS | Implementation report |
| CHANGELOG names the change | PASS | Unreleased entry |
| Usage text lists the five records | PASS | `usage()` with the exception line |

---

## Breaking Changes Validation

### Breaking Change: `--complete` removes five records beside the lock

Documented: Yes (§5, with the hold-record exception)
Migration Path Provided: Yes (none needed)
Migration Tested: Yes (scenario 15, both arms)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

- **QA3-1** (reliability): Step 8 and `--complete` disagree about an unlistable hold directory. Reproduced: hold dir with `held.txt`, `chmod 000` → the Step 8 check form passes; `--complete` keeps the record and warns. Bug report: [task.227.bug.3](./task.227.bug.3.step-8-and-complete-disagree-on-hold-dir.md).

### LOW Severity Issues (1)

- **QA3-2** (reliability): unreadable record deleted silently. Reproduced: `chmod 000` on `step4-hold-dir.txt` → `--complete` prints nothing and both records are gone; `held.txt` is still in the hold dir.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
The matcher is linear: 0.05 ms at 64k characters.

### Reliability — CONCERNS
QA3-1 and QA3-2. Both need a hold dir or record its creator cannot read, so the trigger is unlikely, but QA3-1 lets a pipeline run report itself finished in that state.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` from `task.227.qa.3.security.run.json`; escaped 0)
- `boundary: true`: `lineRunsNoRm`, probed with rm-specific cases including the cycle-2 redirection forms. Verdict `engages`.

### Maintainability — PASS
QA3-1 is also a maintainability signal: one rule in two places drifted within one cycle. The fix should leave one definition.

---

## Code Review

Narrowed review, `code_review_blocking=true` (pipeline override). Neither finding is `bug` + `high` confidence, so neither was promoted automatically. QA raised both after reproducing them.

**Correctness bugs (2):**
- [medium/medium] `shared/resources/develop-pipeline-step-8-commit.md:288`: CR-1. Raised as QA3-1.
- [low/low] `shared/resources/advance-pipeline-lock.sh:187`: CR-2. Raised as QA3-2. Confidence rose to high on reproduction.

**Cleanups (0).**

**Mutation proofs** (worktree at `b479f628`, baseline green):

mutation-proven: `step4-held-paths.txt` back in the unconditional `rm` → `[bash] --complete ({lock,no-lock} arm) keeps both hold records ({full,unlistable} hold dir)` → covered
mutation-proven: `ls -A` exit status ignored → `[bash] --complete ({lock,no-lock} arm) keeps both hold records (unlistable hold dir)` → covered
mutation-proven: the cycle-1 `rm` lookahead restored → `lineRunsNoRm refuses every way a line runs rm and nothing else` → covered

All three are `covered`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh` (all scenarios) | PASS 84/84 |
| `step-8-completion-checklist.test.mjs` incl. executed-against-fixtures | PASS 62/62 |
| Full `npm test` via `ci:fast` | PASS 6289/0 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/advance-pipeline-lock.sh`, `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-step-8-commit.md`, `shared/resources/tests/lib/rm-invocation.mjs`, `shared/resources/tests/step-8-completion-checklist.test.mjs`, `CHANGELOG.md`, the task document.

### Test Commands Executed
```bash
npm run ci:fast                       # via quality-gate.sh, symlink moved aside: 6289 tests, 0 failed
bash shared/resources/advance-pipeline-lock.test.sh                                      # 84/84
node --test shared/resources/tests/step-8-completion-checklist.test.mjs                  # 62/62
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec \
  --entry shared/resources/tests/lib/rm-invocation.mjs#lineRunsNoRm --cases-file <rm cases> \
  --record docs/tasks/task.227.step-8-checklist-no-rm/task.227.qa.3.security.run.json      # engages, 20
```

### Coverage Report
Not measured (shell and `node:test` suites, no coverage instrumentation).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA3-1: one definition of the hold-record rule, read by `--complete` and the Step 8 check, with an unlistable case in the Step 8 fixtures.

### Short-term Actions (Non-Blocking)
1. QA3-2: an unreadable record counts as pending, in the same rule.
2. Gate 2 CR-1, carried over: a halt-snapshot check in the no-lock arm (follow-up).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One reproduced MEDIUM finding, a disagreement between two checks that cycle 2 introduced. No HIGH.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions** (if conditional): QA3-1 fixed, or waived with a reason.

---

**QA Report**: co-located at `task.227.qa.3.step-8-checklist-no-rm.md`
**Gate File**: co-located at `task.227.gate.3.step-8-checklist-no-rm.yml`
**Next Steps**: The develop-task loop routes the gate (classifier), then either `/qa-fix` cycle 3 or 5c.
