# QA Report: Task 165 - Close task.164's deferred follow-ups (cycle 3)

**Task**: [task.165.task-164-deferred-follow-ups.md](./task.165.task-164-deferred-follow-ups.md)
**Gate File**: [task.165.gate.3.task-164-deferred-follow-ups.yml](./task.165.gate.3.task-164-deferred-follow-ups.yml)
**Previous Gate**: [task.165.gate.2.task-164-deferred-follow-ups.yml](./task.165.gate.2.task-164-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: PASS

---

## Executive Summary

Both cycle-2 findings are fixed and mutation-proven. Whether the review-skill gates hold the lock is
now read off the lock after the helper call, so every held lock prints the refusal line. Their prose
claims only what the verdict can tell. The `fence:` probe executes 22 cases with 0 escapes. The
scoped diff review returned three findings, none high-confidence. All three restate cycle-2 lows on
unchanged logic, and a measured plausibility check puts the main one at 0 of 632 documents. They go
to future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| -------------- | -------- | ------ | -------- |
| QA2-1: the gate prose claimed Step 2 HALTs on a failed verdict | medium | ✅ FIXED | Prose scoped in both skills and in `pipeline-lock-cooperation.md`. `(NEEDS REVISION, ready-for-development)` and `(NO-GO (Revision), ready-for-development)` rows hold the lock and print the refusal; mutation M15 red |
| QA2-2: the pass branch held the lock silently on helper failure | medium | ✅ FIXED | Post-condition grep on `current_step`, helper stderr kept. Helper-missing and corrupt-lock tests for both skills; mutations M13, M14 red. `fence:` case `helper-cannot-advance` rejected |

---

## New Findings This Cycle

None in the gate. The three advisory findings below sit on logic cycle 2 did not change (the status
`grep`, only re-indented). Cycle 2 already recorded them as CR-4 and CR-5.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#757)

### Testing Approach

- [x] Automated Testing (executed prose)
- [x] Regression Testing (`ci:fast`)
- [x] Security Review (`fence:` probe, recorded)
- [x] Code Review (Step 3b, independent Explore reviewer)

### Review Methodology

Direct tools. Re-review, cycle 3.

Re-review scope: files changed since gate 2 (head accaa2959db6; 19 files) — default

The reviewer was dispatched at 16:03:50Z, and its notification gives `duration_ms` 114422. Mutation
proofs ran only after it had returned. This cycle's qa-task run followed the skill text loaded
earlier in this session.

Step 4b ran on the three changed in-scope Markdown files. Only bash ran: zsh is not installed on this
host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Exception 2 wording | PASS | Verified | Unchanged |
| Phase 2: HALT pin and hook floor | PASS | Verified | Unchanged |
| Phase 3: 4b meta-test early exit | PASS | Verified | Unchanged |
| Phase 4: review-skill lock cooperation | PASS | Verified | QA2-1 and QA2-2 fixed |
| Phase 5: proof and gates | PASS | Verified | M11 and M13–M16 re-run by QA, all red |

**Overall Phase Completion**: 5/5 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Review skills advance only on a pass | READY/GO plus promoted → 3, else 2, refusal line on every held lock | As stated | PASS | `review-lock-cooperation.test.mjs` 4/4, including helper-missing and corrupt lock |
| Boundary probed | `probes_executed` > 0 | 22 | PASS | `task.165.qa.3.security.run.json` |
| `ci:fast` with `.agents/skills` aside | pass | 6393 tests, 0 fail | PASS | Fast gate of fix cycle 2, on the tree committed as `239b2eb4` |
| Targeted tests | pass | 71/71 | PASS | review-lock-cooperation, step-8-completion-checklist, 4b-setup |

---

## Breaking Changes Validation

None. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (advisory, routed to `recommendations.future`)

- CR-1 and CR-2 (medium severity, medium confidence; not promoted): the status `grep` in both gates
  spans the whole file. Plausibility measured: 0 of 632 tracked task and story documents carry a
  `status:` line outside their frontmatter. The reader was calibrated first on a constructed
  document with a fenced body line, and it counted 1.
- CR-3 (low/low): the review-story Step 10 edit example names the body status; the gate reads the
  frontmatter.

**Total Issues in the gate**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
QA2-2 fixed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 22 (run record `totals.executed`), escaped 0
- `fence:` probe on both gates, 11 cases each, including `helper-cannot-advance`. Cases:
  `shared/resources/tests/fixtures/fence-probe/t165-review-{task,story}-cases.json`.

### Maintainability — PASS
QA2-1 fixed.

---

## Code Review

Scoped to the files changed since gate 2. Blocking is on (`code_review_blocking=true`). No finding
is high-confidence, so none was promoted.

**Correctness bugs (3):**
- [medium/medium] `skills/review-story/SKILL.md:2896`: the status `grep` spans the whole file → read `status:` from the frontmatter only
- [medium/medium] `skills/review-task/SKILL.md:2344`: same whole-file `grep` → one shared frontmatter reader
- [low/low] `skills/review-story/SKILL.md:2896`: the gate reads the frontmatter, while the Step 10 edit example names the body field → make Step 10 name the frontmatter

**Cleanups (0).**

**Step 4b:** 1 changed block per `SKILL.md`, classified `mutating`, 0 executed by the engine (as in
cycles 1 and 2). The committed `review-lock-cooperation.test.mjs` and the `fence:` probe (22 runs)
both execute them.

**Boundary:** `boundary: true`. `probes_executed: 22`, `escaped: 0`.

**Mutation proofs:**
- mutation-proven: review-task refusal keyed on the branch, not the lock → `review-lock-cooperation.test.mjs` (helper missing / corrupt lock) → covered
- mutation-proven: review-story refusal keyed on the branch, not the lock → `review-lock-cooperation.test.mjs` (helper missing / corrupt lock) → covered
- mutation-proven: review-task advances on NEEDS REVISION → `review-lock-cooperation.test.mjs` (NEEDS REVISION, ready-for-development) → covered
- mutation-proven: review-story gate accepts `in-progress` → `review-lock-cooperation.test.mjs` → covered
- mutation-proven: review-task block runs with no lock → `review-lock-cooperation.test.mjs` no-lock test → covered

5 of 5 proven. Restores were `cmp`-clean.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `ci:fast` (6393 tests) | PASS — 0 fail |
| Targeted tests (71) | PASS |

---

## Test Artifacts

### Files Reviewed
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `shared/resources/pipeline-lock-cooperation.md`
- `shared/resources/tests/review-lock-cooperation.test.mjs`, the `fence:` fixtures

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:<SKILL.md>#<heading>' \
  --slot '{outcome}' --cases-file <cases.json> --repo-root "$(pwd)" \
  --record docs/tasks/task.165.task-164-deferred-follow-ups/task.165.qa.3.security.run.json --json   # per skill
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed .md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .claude/state/t165-mut3.mjs; node .claude/state/t165-mut2.mjs   # M11, M13–M16
node --test shared/resources/tests/review-lock-cooperation.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs
```

### Coverage Report
Not instrumented. This change set is shell-in-Markdown plus Node tests.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Frontmatter-only status read in both review gates (CR-1, CR-2)
2. review-story Step 10 names the frontmatter status (CR-3)
3. Cycle-2 CR-3 and CR-6 (low)

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every gate finding across three cycles is fixed and mutation-proven. The boundary is measured, and the remaining findings are advisory.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.165.qa.3.task-164-deferred-follow-ups.md`
**Gate File**: co-located at `task.165.gate.3.task-164-deferred-follow-ups.yml`
**Next Steps**: Step 5c `/review-pr`
