# QA Report: Task 309 - Pin the 6c head writer position and clear the stale head file

**Task**: [Link to task document](./task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md)
**Gate File**: [task.309.gate.1.pin-6c-head-writer-position-and-clear-stale-head-file.yml](./task.309.gate.1.pin-6c-head-writer-position-and-clear-stale-head-file.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Testing Completed**: 2026-11-15
**Gate Status**: PASS

---

## Executive Summary

The change adds the 6c head file to the `rm -f` that already clears the result and pid files, and adds two committed tests: an order test (rm, then writer, then poll launch) and a clear test that runs the shipped `rm` and writer lines over a stale head file. Both changes hold, and both mutations turn a committed test red.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#909, open, base develop)

### Testing Approach

- [x] Automated Testing (`finalise-publish-boundary.test.mjs`, 48 tests; fast gate recorded by develop)
- [x] Regression Testing
- [x] Code Review (diff reviewer, Step 3b)
- [x] Mutation proofs (two)
- [ ] Manual / Performance / Security Review: not applicable (see NFR Assessment)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (lite-mode shape; a 3-phase, single-module, low-risk task). First review, so the whole branch diff (`origin/develop...HEAD`, 573 lines, 9 files) was reviewed, not a scoped one.

Diff review: code review (the change set holds `skills/finalise/SKILL.md` and a test file).

CI on 8679ee21504f: pending. Read once through `qa-ci-read.sh`; an undecided reading changes nothing in the gate, and `/finalise` Step 6 gates CI once on the final commit.

Re-review scope: not applicable (first review).

Step 4b: `skills/finalise/SKILL.md` carries runnable prose, so the engine ran over it with `--diff-base`. Result: `changed` = 1 block, refused as `mutating` (it runs `rm` and `nohup`), 0 executed; file-wide, 2 placeholder and 48 mutating. The engine emitted `zero-blocks-executed` and `changed-blocks-not-executed`. Neither can be cleared by `--slot` or `--bind`: the changed block launches a background poll and deletes files, so the allow-list refuses it by design. What stands in for executing it is the committed clear test, which runs the shipped `rm` and writer lines from the file in a scratch directory. Recorded here rather than dropped, per the Step 4b rule; advisory, not a gate input.

---

## New Findings This Cycle

_First review; there is no previous cycle to compare against._

- **[low]** `evals/shared/tests/finalise-publish-boundary.test.mjs:734` — the rerun half of the clear test passes without the new `rm`, because the writer overwrites the same file → optional trim (CR-2, advisory).
- **[medium/low confidence, pre-existing]** `skills/finalise/SKILL.md:2277` — the poll block reads `CI_HEAD_2` and `PR_NUMBER` with no assignment inside the block → separate task (CR-1; see Provenance below).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: order test | PASS | Verified | `rmAt < writeAt < launchAt` asserted over `codeLines(sixC)`; each index asserted present first |
| Phase 2: clear the head file and test it | PASS | Verified | `rm -f "$RESULT" "$PIDFILE" .claude/state/finalise-ci-head-2.txt` at `skills/finalise/SKILL.md:2269`; comment added above the writer |
| Phase 3: docs, bundle, CHANGELOG | PASS | Verified | one clause in `shared/resources/develop-pipeline-hooks.md`, three regenerated copies, CHANGELOG `(task 309)` |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Moving the writer below the launch turns the order test red | red | red | PASS | mutation 1 below |
| A stale head file is gone after the shipped `rm` line | gone | gone | PASS | the clear test; red when the `rm` drops the file (mutation 2) |
| The later-turn reader is unchanged; its existing tests stay green | green | 48/48 | PASS | `skills/finalise/SKILL.md:2300` unchanged by the diff |
| Fast gate passes with 0 not ok | 0 | 0 | PASS | develop step, `npm run test:remote`: 8477 tests, 8474 pass, 0 fail, 3 skipped. This cycle re-ran `finalise-publish-boundary.test.mjs` only: 48 pass, 0 fail |

**Performance Criteria:** none stated; one path added to an existing `rm -f`. PASS.

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `npm run bundle:check` clean | clean | 129 skills, 0 problems | PASS | |
| `npm run validate -- skills/finalise/` | pass | pass | PASS | the standards-named validation command |
| CHANGELOG cites the task | cites | `cites (task 309)` | PASS | `changelog-cites.sh` |
| Criteria edited after review | none | `criteria-drift: clean` | PASS | base: review commit |

**Platform variance.** The test builds its scratch directory under `os.tmpdir()` but does not hand a path to a validating consumer. Re-run under `TMPDIR=/tmp` as the skill asks: 48 pass, 0 fail.

---

## Breaking Changes Validation

None. The change is to a step-doc block and to tests.

**Overall Breaking Changes Assessment:** PASS (N/A)

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (two advisory items below, neither a gate issue)

---

## NFR Assessment

### Performance — PASS
No timing criterion; the change adds one path to an existing `rm -f`.

### Reliability — PASS
A run that aborts between the `rm` and the writer now leaves no head file, so the later turn HALTs "not recorded" rather than reading a previous run's head.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates named: the `rm` line (a state clear, not a refusal), the head writer line (a writer, which the boundary rule lists as a non-boundary), the order assertion (a test). None accepts or rejects an input. `probe-boundary-signals.mjs` matched no phrase in the criteria, so `boundary_signals: []`.

### Maintainability — PASS
The comment above the writer says what the `rm` guards. The order test locates each line by its own pattern and asserts it exists, so a renamed line fails loudly.

---

## Code Review

Advisory: the task's run-level `code_review_blocking=true` applies, but neither finding is `category: bug` at `confidence: high`, and QA reproduced neither as a defect of this change.

**Correctness bugs (1):**
- [medium/low] `skills/finalise/SKILL.md:2277` — the poll block reads `$CI_HEAD_2` (writer and `nohup` line) and `$PR_NUMBER` with no assignment inside the block; both are bound in earlier fenced blocks, so a fresh shell would write an empty head file. → bind or guard in the block. **Provenance (5b):** the same two lines exist on the PR base (`git show origin/develop:skills/finalise/SKILL.md`: the writer at 2274 and the `nohup` line at 2276 read `$CI_HEAD_2` and `$PR_NUMBER` identically), so the shape is not introduced by this change; the task's scope is the `rm` and the order test, not the binding. Classified `pre-existing`, routed to the gate's `recommendations.future`, not to `top_issues[]`. The reviewer's `confidence: low` is recorded unchanged. The anchor check read `ok`.

**Cleanups (1):**
- `evals/shared/tests/finalise-publish-boundary.test.mjs:741` — the rerun half of the clear test passes without the new `rm` (the writer overwrites the file); only the rm-alone half tests it. → optional trim. ⚠️ unverified anchor (text-mismatch): the reviewer named line 741; the quoted text `${vars}CI_HEAD_2=${head}` is at line 734 of the committed test.

mutation-proven: moved the head writer below the `nohup bash "$POLL"` launch (Edit on the working file, edited back; `cmp` against the snapshot clean) → `6c poll block records the acceptance head it starts on, for the later turn to read` went red → covered
mutation-proven: dropped `.claude/state/finalise-ci-head-2.txt` from the `rm -f` line (Edit, edited back; `cmp` clean) → `6c poll block clears a previous run's head file, then records the new head` went red → covered

Both mutations were applied with Edit on the working file after the diff reviewer had returned and with nothing else running over the tree; baseline 48/48 green before and after each. Working tree for `skills/`, `evals/`, `shared/` and `CHANGELOG.md` matches the commit after both (`git status --porcelain` empty for them).

`probes_executed: 0`, `escaped: 0` (boundary false; see Security).

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Other tests in `finalise-publish-boundary.test.mjs` (reader, publish boundary, CHANGELOG box) | PASS (48/48) |
| Bundled copies of `develop-pipeline-hooks.md` (develop-bug, develop-story, develop-task) | PASS (`bundle:check` clean) |
| Whole suite | PASS at develop step (8477 tests, 0 fail) |

---

## Test Artifacts

### Files Reviewed
`skills/finalise/SKILL.md`, `evals/shared/tests/finalise-publish-boundary.test.mjs`, `shared/resources/develop-pipeline-hooks.md` and its three copies, `CHANGELOG.md`, the task, plan, review and implementation documents.

### Test Commands Executed
```bash
command node --test evals/shared/tests/finalise-publish-boundary.test.mjs      # 48 pass
TMPDIR=/tmp command node --test evals/shared/tests/finalise-publish-boundary.test.mjs   # 48 pass
npm run validate -- skills/finalise/                                           # pass
npm run bundle:check                                                           # 129 skills, 0 problems
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.309             # cites (task 309)
```

### Coverage Report
Not applicable: the code under test is a Markdown step-doc block, and the tests read it by path.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: bind or guard `CI_HEAD_2` and `PR_NUMBER` inside the 6c poll block (pre-existing; separate task).
2. CR-2: optionally trim the redundant rerun half of the clear test.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both changes are in place and each is held by a committed test that goes red when the behaviour is reverted. No finding enters the gate.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: none

---

**QA Report**: co-located at `task.309.qa.1.pin-6c-head-writer-position-and-clear-stale-head-file.md`
**Gate File**: co-located at `task.309.gate.1.pin-6c-head-writer-position-and-clear-stale-head-file.yml`
**Next Steps**: 5c `/review-pr` as the exit gate, then `/finalise`.
