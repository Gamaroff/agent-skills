# QA Report: Task 165 - Close task.164's deferred follow-ups (cycle 2)

**Task**: [task.165.task-164-deferred-follow-ups.md](./task.165.task-164-deferred-follow-ups.md)
**Gate File**: [task.165.gate.2.task-164-deferred-follow-ups.yml](./task.165.gate.2.task-164-deferred-follow-ups.yml)
**Previous Gate**: [task.165.gate.1.task-164-deferred-follow-ups.yml](./task.165.gate.1.task-164-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1 closed all three findings. Both review-skill gates now print a refusal line, and the
`fence:` probe executes 20 cases against them with 0 escapes, so security moves from `reasoned` to
`measured` PASS. The cycle-2 refute pass found two new MEDIUM defects, both high confidence, in the
review-task gate:

- Its prose claims the orchestrator HALTs on a failed verdict. The orchestrator decides on status.
- A helper failure on the pass branch holds the lock without the refusal line the cycle-1 fix promised.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after QA2-1 and QA2-2

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| -------------- | -------- | ------ | -------- |
| QA-1: gates refuse silently, `probes_executed` 0 | medium | ✅ FIXED | `elif` refusal line in both blocks. `fence:` probe 10/10 per skill, `hostile-rejected-legitimate-accepted`; run record totals executed 20, escaped 0 |
| QA-2: unpromoted-GO prose wrong for `in-progress` | low | ✅ FIXED | review-story prose names the `in-progress` path. `in-progress` rows for both skills in `review-lock-cooperation.test.mjs`; mutation M11 red |
| QA-3: review-task heading names `/develop-story` | low | ✅ FIXED | Heading reads `(when invoked by /develop-task)` |

---

## New Findings This Cycle

- **[medium]** `skills/review-task/SKILL.md:2330` — QA2-1 (CR-1). The prose says develop-task Step 2
  HALTs on NEEDS REVISION or REQUIRES REWORK. Step 2 decides on post-review status (the develop-task
  table in `develop-pipeline-step-2-review.md`). Separately, review-task Step 9 promotes a NEEDS
  REVISION task once the Step 8.5 fixes are enough. That pair proceeds in the orchestrator, while
  the gate holds the lock and prints "the review did not pass". It fails safe, because the
  orchestrator's own Step 2 → 3 advance moves the lock, but the claim and the refusal text are
  false. → Gate on what the orchestrator decides on, correct the prose, and add the row.
- **[medium]** `skills/review-task/SKILL.md:2342` (and `skills/review-story/SKILL.md:2896`) — QA2-2
  (CR-2). The cycle-1 contract says a block that holds the lock prints one line. On the pass branch
  the helper can hold it silently:
  - With jq missing, the helper exits 0 and writes only to the discarded stderr (`advance-pipeline-lock.sh:271-273`).
  - A corrupt lock exits 1 under `|| true`.
  - A missing helper is silent.

  → Print the refusal whenever the lock is still below 3 after the call, and test with the helper absent.

Both are new to this branch: the review-task block does not exist on `origin/develop`, and the
refusal contract was added in cycle 1. Both are in scope, so neither is `pre-existing`.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#757)

### Testing Approach

- [x] Automated Testing (unit, executed prose)
- [x] Regression Testing (`ci:fast`)
- [x] Security Review (`fence:` probe, recorded)
- [x] Code Review (Step 3b refute pass, independent Explore reviewer)

### Review Methodology

Direct tools. Re-review, cycle 2.

Re-review scope: unscoped — cycle 2 refute pass over the full branch diff (`origin/develop...HEAD`, 28 files)

The refute reviewer was dispatched at 15:47:16Z, and its notification gives `duration_ms` 277529.
Mutation proofs ran only after it had returned.

Step 4b ran on the four changed in-scope Markdown files. Only bash ran: zsh is not installed on this
host (`zsh-unavailable`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Exception 2 wording | PASS | Verified | Unchanged since gate 1 |
| Phase 2: HALT pin and hook floor | PASS | Verified | Unchanged since gate 1 (CR-6 advisory) |
| Phase 3: 4b meta-test early exit | PASS | Verified | Unchanged since gate 1 (CR-3 advisory) |
| Phase 4: review-skill lock cooperation | CONCERNS | Partial | QA2-1, QA2-2 |
| Phase 5: proof and gates | PASS | Verified | M9–M12 re-run by QA, all red |

**Overall Phase Completion**: 4/5 phases passed, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Review skills advance only on a pass | READY/GO plus promoted → 3, else 2 | As stated, refusal line printed when the lock is held | CONCERNS | `review-lock-cooperation.test.mjs` 3/3. QA2-1: the pass definition differs from the orchestrator's. QA2-2: a helper failure is silent |
| Boundary probed | `probes_executed` > 0 | 20 | PASS | `task.165.qa.2.security.run.json` |
| `ci:fast` with `.agents/skills` aside | pass | 6392 tests, 0 fail | PASS | Run in cycle-1 qa-fix on the tree committed as `accaa295` |
| `bundle:check`, `lint:shell`, `quick_validate` | clean | clean, clean, ✓ ✓ | PASS | Re-run by QA |

The other criteria are unchanged since gate 1.

---

## Breaking Changes Validation

None. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: QA2-1, the review-task gate's pass definition differs from the orchestrator's**
- **Severity**: MEDIUM
- **Category**: Functional (prose accuracy, lock state)
- **Observation**: See New Findings
- **Impact**: Fails safe. The orchestrator advances the lock itself, but the refusal line and the prose are false for a promoted NEEDS REVISION task
- **Recommendation**: Gate on the promoted status. Correct the HALT claim in `SKILL.md` and `pipeline-lock-cooperation.md`
- **Priority**: P2

**Issue: QA2-2, the pass branch can hold the lock silently**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: See New Findings
- **Impact**: A held lock is indistinguishable from a block that never ran. That is the property cycle 1 added the refusal line to provide
- **Recommendation**: Check `current_step` after the call and print the refusal when it is below 3
- **Priority**: P2

No bug report files: both findings live in the gate, and the qa-fix loop consumes them directly.

### LOW Severity Issues (4, advisory)

- CR-3: a stray `ADVANCE_LOCK_TEST_4B_ONLY` export shortens the direct `test:suite` run
- CR-4: review-story Step 10's edit example names only the body status
- CR-5: the status match is not limited to the frontmatter and refuses a quoted value
- CR-6: the `namesSkill` self-check has no positive control

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 4

---

## NFR Assessment

### Performance — PASS
Unchanged since gate 1.

### Reliability — CONCERNS
QA2-2.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (run record `totals.executed`), escaped 0
- `boundary: true`. The `fence:` form was run on each skill's `## Pipeline Lock Cooperation` block
  with `--slot {outcome}`. Each run had 2 legitimate cases (pass and promoted; no lock) and 8
  hostile cases:
  - a failing verdict
  - unpromoted
  - `in-progress`
  - a quoted status
  - a suffixed status
  - a lowercase verdict
  - a verdict with a trailing space
  - a truncated verdict

  Every case scored as its direction requires. Cases: `shared/resources/tests/fixtures/fence-probe/t165-review-{task,story}-cases.json`.

### Maintainability — PASS
QA2-1 is a prose accuracy defect and is tracked as a top issue.

---

## Code Review

Refute pass over the full branch diff. Blocking is on (`code_review_blocking=true`). Anchor check:
`finding-anchors: ok`.

**Correctness bugs (6):**
- [medium/high] `skills/review-task/SKILL.md:2330`: Step 2 HALT claim false; NEEDS REVISION plus promoted proceeds. Promoted → **QA2-1**
- [medium/high] `skills/review-task/SKILL.md:2342`: pass branch silent on helper failure (jq missing, corrupt lock, missing helper). Promoted → **QA2-2**
- [low/medium] `shared/resources/advance-pipeline-lock.test.sh:199`: a stray seam export shortens `test:suite` → `env -u` in package.json
- [low/low] `skills/review-story/SKILL.md:2895`: the gate reads frontmatter status, but the Step 10 example edits the body → name the frontmatter in Step 10
- [low/low] `skills/review-task/SKILL.md:2341`: the status match spans the whole file and refuses a quoted value → limit it to the frontmatter
- [low/medium] `shared/resources/tests/step-8-completion-checklist.test.mjs:1055`: no positive control for `namesSkill` → add matching cases

**Cleanups (0).**

**Step 4b (executed prose):** 1 changed block per `SKILL.md`, classified `mutating` (it calls
`advance-pipeline-lock.sh`), 0 executed by the engine. `changed-blocks-not-executed` and
`zero-blocks-executed` were reported for both `SKILL.md` files, as in cycle 1. The changed blocks are
executed by the committed `review-lock-cooperation.test.mjs` under every shell in `SHELLS`, and by
the `fence:` probe (20 runs). The two `shared/resources` files have no changed blocks.

**Boundary:** `boundary: true` (repository-state refusal). `probes_executed: 20`, `escaped: 0`.

**Mutation proofs (this cycle's fixes):**
- mutation-proven: review-task refusal branch removed → `review-lock-cooperation.test.mjs` (review-task refusal line missing) → covered
- mutation-proven: review-story refusal branch removed → `review-lock-cooperation.test.mjs` (review-story refusal line missing) → covered
- mutation-proven: review-story gate accepts `in-progress` → `review-lock-cooperation.test.mjs` (GO with status in-progress) → covered
- mutation-proven: refusal printed with no lock → `review-lock-cooperation.test.mjs` no-lock test → covered

4 of 4 proven. Restores were `cmp`-clean, and `git status` was unchanged afterwards.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `ci:fast` (6392 tests) | PASS — 0 fail |
| `bundle:check` | PASS — 0 problems |
| `lint:shell` | PASS — clean |

---

## Test Artifacts

### Files Reviewed
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`
- `shared/resources/pipeline-lock-cooperation.md`, `shared/resources/develop-pipeline-step-2-review.md`
- `shared/resources/advance-pipeline-lock.sh`
- `shared/resources/tests/review-lock-cooperation.test.mjs`
- `shared/resources/tests/fixtures/fence-probe/t165-review-task-cases.json`, `t165-review-story-cases.json`

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry 'fence:skills/review-task/SKILL.md#Pipeline Lock Cooperation (when invoked by `/develop-task`)' \
  --slot '{outcome}' --cases-file shared/resources/tests/fixtures/fence-probe/t165-review-task-cases.json \
  --repo-root "$(pwd)" --record docs/tasks/task.165.task-164-deferred-follow-ups/task.165.qa.2.security.run.json --json
# (and the same for review-story, same --record)
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed .md> \
  --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
python skills/create-skill/scripts/quick_validate.py skills/review-task   # and review-story
npm run bundle:check; npm run lint:shell
node .claude/state/t165-mut2.mjs   # M9–M12
```

### Coverage Report
Not instrumented. This change set is shell-in-Markdown plus Node tests.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA2-1: align the review-task gate and its prose with the orchestrator's Step 2 decision
2. QA2-2: print the refusal line on every held-lock path

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5, CR-6 (low)

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two MEDIUM, high-confidence code-review defects were promoted under `code_review_blocking`.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA2-1 and QA2-2 fixed and re-reviewed

---

**QA Report**: co-located at `task.165.qa.2.task-164-deferred-follow-ups.md`
**Gate File**: co-located at `task.165.gate.2.task-164-deferred-follow-ups.yml`
**Next Steps**: qa-fix cycle 2, then QA cycle 3
