# QA Report: Task 236 - create-task 1.1 omits the required taskId argument to seedFromObservations

**Task**: [Link to task document](./task.236.create-task-seed-step-call.md)
**Gate File**: [task.236.gate.3.create-task-seed-step-call.yml](./task.236.gate.3.create-task-seed-step-call.yml)
**Previous Report**: [task.236.qa.2.create-task-seed-step-call.md](./task.236.qa.2.create-task-seed-step-call.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA2-1: substituted values expanded by bash | ✅ FIXED | Both assignments are single-quoted, and the step allows only digits, commas and spaces. The new test substitutes `$(...)`, a backtick, `$HOME` and `"` through the block: each is refused, named as typed, and runs nothing. Mutation (OBS_IDS back to double quotes) → that test red: covered. |
| CR-2 (cycle 2): probe could not see the substitution step | ✅ FIXED | Cases are built from the block's own lines. Double quotes in both block and slot → 4 hostile cases accepted (proven at 5b). |
| CR-4 (cycle 2): pid-named worktree | ✅ FIXED | `mkdtemp` path. See CR-3 below on the prune comment. |
| CR-3 / CR-5 (cycle 2, advisory) | ⚠️ NOT FIXED (advisory) | Carried to `recommendations.future`. |

---

## New Findings This Cycle

- **[low]** `skills/create-task/SKILL.md:219` — CR-1: 19 other `NAME="{placeholder}"` assignments in executed SKILL.md blocks double-quote substituted text. They are pre-existing (19 on `origin/develop`, outside create-task) and outside this task's scope, so they go to future work.
- **[low]** `skills/create-task/SKILL.md:220` — CR-2: a `'` is the one input the quoting leaves to the prose rule. The step names it.
- **[cleanup]** `skills/create-task/tests/seed-step-block.test.js:286` — CR-3: `git worktree prune` removes only registrations whose directory is gone, so the comment overstates it.
- **[cleanup]** `docs/tasks/task.236.create-task-seed-step-call/task.236.create-task-seed-step-call.md:388` — CR-4: the Implementation Record reports the first-pass 2 tests.

None promoted: no `category: bug` finding at `confidence: high`.

---

## Executive Summary

The cycle-2 fix holds. Shell syntax substituted into the seed block reaches the node guard as typed, and the probe reproduces the old defect when the quoting is reverted. The scoped review raised four low or cleanup findings and no high-confidence bug. All three success-criterion groups pass. The performance margin is thin: 4.3 s against a 5 s bound.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#763, OPEN, head `7cb55772`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing
- [x] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools plus one Explore diff reviewer (re-review). Reviewer dispatched 06:48:33Z and returned at 129,243 ms (`duration_ms`). Mutation spot-check run after it returned.

Re-review scope: files changed since gate 2 (head 68048996b01c; 9 files) — default

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: test that runs the block | PASS | Verified | 6 tests in `seed-step-block.test.js` |
| Phase 2: block in SKILL.md | PASS | Verified | single-quoted values, task-number guard, own heading |
| Phase 3: proofs, bundle, validate, CI | PASS | Verified | ci:fast 6422 / 0 fail at 5b |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --------- | ------ | ------ | ------ | -------- |
| One bash block calls `seedFromObservations` with `{ taskId }` | 1 | 1 | PASS | Test 1 (`seedBlock()` asserts exactly one); `SKILL.md:235` |
| Two open entries → one seed, park names the task | Yes | Yes | PASS | Test 1 |
| Mismatched frontmatter id → non-zero | Yes | Yes | PASS | Test 2 |
| § 1.1 says the task id is read before the seed | Yes | Yes | PASS | `SKILL.md:208-209` |
| New test < 5 s on PR head | < 5 s | 4.408 s, 4.275 s at load 1.66 | PASS (thin margin) | `uptime; time command node --test skills/create-task/tests/seed-step-block.test.js` |
| `from-observation.test.js` untouched | empty diff | empty | PASS | not in `origin/develop...HEAD` |
| `node:test` + `node:assert` only; Prettier clean | Yes | Yes | PASS | Prettier `--check` at 5b |
| Each mutation turns a named test red | Yes | Yes | PASS | Mutation lines below and in qa.1 and qa.2 |
| validate; bundle:check | clean | rc 0; 0 problems | PASS | validate rc 0 this cycle |
| CHANGELOG `[Unreleased]` | Yes | Yes | PASS | `CHANGELOG.md:9` |
| No other skill restates the call | only § 1.1 | only § 1.1 | PASS | Step 3.5 population 1 at 5b |

---

## Breaking Changes Validation

None.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

CR-1 to CR-4, listed in New Findings above.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS
4.3–4.4 s at load 1.66, against a bound of < 5 s. The probe test takes 2.3 s. The margin is thin and is recorded as future work.

### Reliability — PASS
`mkdtemp` worktree path. CR-3 is a comment correction.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 18 (record `task.236.qa.3.security.run.json`; `reproduced` 0, `escaped` 0)
- `boundary: true`, reached through `fence:` by `seed-block-probe.js`. The residual `'` breakout is held only by the prose rule, which the step states (CR-2, low/low).

### Maintainability — PASS
CR-4 is a documentation correction.

---

## Code Review

Advisory except for promoted findings (`code_review_blocking=true`); none promoted. All 4 anchors `ok` (rev `7cb55772`).

**Correctness bugs (2):**
- [low/medium] `skills/create-task/SKILL.md:219` — other skills still double-quote substituted placeholders (pre-existing: 19 sites on `origin/develop`) → follow-up task.
- [low/low] `skills/create-task/SKILL.md:220` — a `'` still ends the quotes; only the prose rule stops it → name the gap in the test, or bind through a delimiter the guard can see past.

**Cleanups (2):**
- `skills/create-task/tests/seed-step-block.test.js:286` — the prune comment overstates what prune does.
- `docs/tasks/task.236.create-task-seed-step-call/task.236.create-task-seed-step-call.md:388` — the Implementation Record reports the first-pass 2 tests.

**Provenance (CR-1):** `git grep -nE '^\s*[A-Z_]+="\{[a-z-]+\}"' origin/develop -- 'skills/*/SKILL.md'`, create-task excluded → 19 hits on base. The defect class is outside this task's scope (the create-task seed step), so it is `pre-existing` and goes to `recommendations.future`.

**Probe boundary:** `boundary: true`; `probes_executed: 18`; `escaped: 0`.

**Step 4b:** 1 changed block, refused as `mutating`, 0 executed: `changed-blocks-not-executed` (advisory). The test and the probe run that block from disk.

**Mutation proofs (this cycle, after the reviewer returned):**
- mutation-proven: `OBS_IDS` back to double quotes → `shell syntax substituted into the placeholders…` red → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| create-task suite | 50/50 PASS |
| Full suite (`npm run ci:fast`, symlinks aside, at 5b on `7cb55772`'s tree) | 6422 tests, 6408 pass, 0 fail, 14 skipped |

---

## Test Artifacts

### Files Reviewed
- `skills/create-task/SKILL.md` § 1.1
- `skills/create-task/tests/seed-step-block.test.js`
- `skills/create-task/tests/seed-block-probe.js`
- `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test 'skills/create-task/tests/*.test.js'
npm run validate -- skills/create-task/
uptime; time command node --test skills/create-task/tests/seed-step-block.test.js
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
# fence probe via buildSeedProbe(), plus --record docs/tasks/task.236.create-task-seed-step-call/task.236.qa.3.security.run.json
git grep -nE '^\s*[A-Z_]+="\{[a-z-]+\}"' origin/develop -- 'skills/*/SKILL.md'
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Follow-up task for the 19 double-quoted placeholder sites in other skills (CR-1).
2. Performance margin of the test file.
3. CR-2, CR-3, CR-4; carried cycle-2 CR-3 and CR-5.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding above low. Every fix this loop made is covered by a committed test that a mutation turns red.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.236.qa.3.create-task-seed-step-call.md`
**Gate File**: co-located at `task.236.gate.3.create-task-seed-step-call.yml`
**Next Steps**: Step 5c `/review-pr`.
