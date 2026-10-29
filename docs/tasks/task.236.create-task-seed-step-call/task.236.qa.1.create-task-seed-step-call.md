# QA Report: Task 236 - create-task 1.1 omits the required taskId argument to seedFromObservations

**Task**: [Link to task document](./task.236.create-task-seed-step-call.md)
**Gate File**: [task.236.gate.1.create-task-seed-step-call.yml](./task.236.gate.1.create-task-seed-step-call.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: CONCERNS

---

## Executive Summary

The new step 3 block makes the call correctly. It passes `{ taskId }`, calls `seedFromObservations`
once, and refuses every hostile observation id it was probed with. Three medium findings remain:

- the new test fails when the suite runs from a linked git worktree;
- the block accepts a task id that is not a number;
- the probe engine cannot reach the block in the shipped file, so `/finalise` would find zero probes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#763, OPEN, head `78905e63`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [x] Performance Testing
- [x] Regression Testing
- [x] Security Review (fence probe)
- [x] Code Review

### Review Methodology

Direct tools. The task is small: 3 phases, one module, low risk. The Step 3b diff review ran as one
read-only Explore subagent (`code-review-prompt.md`, verbatim). It was dispatched at 06:11Z and
returned at 06:14Z (`duration_ms` 134343). First review: whole branch diff
`origin/develop...HEAD`, 7 files.

Step 4b: ran. `skills/create-task/SKILL.md` contains fenced `bash` blocks and the change touches one
of them. Results are below.

---

## Implementation Verification

| Phase                       | Status   | Test Result | Notes                                                              |
| --------------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| Phase 1: Test first         | CONCERNS | Verified    | Test runs the block; fails from a linked worktree (QA-1)           |
| Phase 2: Rewrite step 3     | CONCERNS | Verified    | Block correct on valid input; TASK_ID unchecked (QA-2); unreachable by `fence:` (QA-3) |
| Phase 3: Prove and ship     | PASS     | Verified    | Mutations re-run; CHANGELOG entry present                          |

**Overall Phase Completion**: 3/3 phases complete, 2 with findings

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| One block calls `seedFromObservations` and passes `{ taskId }` | 1 | 1 | PASS | `seed-step-block.test.js` `seedBlock()` asserts exactly one; `SKILL.md:228` |
| Two open fixtures → one seed, both ids, `multiple-entries`, park names `task.<TASK_ID>` | yes | yes | PASS | test 1, green |
| Id/prefix mismatch → non-zero exit | yes | yes | PASS | test 2 (control), green |
| § 1.1 says the task id is read before the seed | yes | yes | PASS | `SKILL.md:205-206` |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| New test under 5 s | < 5 s | 0.351 s at load 1.15 | PASS | implementation report, Step 4, measured on `78905e63` |
| Existing suite untouched | empty diff | 0 lines | PASS | `git diff origin/develop -- skills/create-task/tests/from-observation.test.js` |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| `node:test` + `node:assert` only; Prettier clean | yes | yes | PASS | `prettier --check`: clean |
| Each Phase 3 mutation turns a named test red | yes | yes (spot-checked) | PASS | see Code Review → mutation proofs |
| `validate` and `bundle:check` | clean | clean | PASS | validate rc 0; 128 skills, 0 problems |

**Migration Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| CHANGELOG `[Unreleased]` | entry | entry | PASS | `CHANGELOG.md` Fixed |
| No other skill restates the call | only § 1.1 | 2 lines, both `SKILL.md` § 1.1 (209, 228) | PASS | `grep -rn seedFromObservations skills shared --include=*.md`, bundled copies excluded |

---

## Breaking Changes Validation

None documented, and none found. `seedFromObservations` is unchanged. **Overall**: PASS (N/A).

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (3)

**Issue QA-1: the new test fails from a linked git worktree**
- **Severity**: MEDIUM
- **Category**: Reliability (platform variance)
- **Observation**: `SCRATCH_ROOT` is built under the checkout the test runs from. In a linked
  worktree, `resolve-observation-workspace.sh` refuses that path. Reproduced with
  `git worktree add --detach` at HEAD: 0 pass, 2 fail, with stderr
  `observation workspace refused: path is inside a linked git worktree`. In the same worktree,
  `from-observation.test.js` passes 15/15 because it guards its scratch base.
- **Impact**: the suite goes red under `/develop-batch`, which dispatches into worktrees.
- **Recommendation**: build the scratch base under the main checkout, as `scratchRoot()` in
  `shared/resources/tests/observation-log.test.mjs` does, and add the `SCRATCH_REFUSAL` guard.
- **Priority**: P2

**Issue QA-2: the block accepts a task id that is not a number**
- **Severity**: MEDIUM
- **Category**: Functional (input validation at a boundary)
- **Observation**: the block checks every observation id against `/^[0-9]+$/` but never checks
  `TASK_ID`. The fence probe and a hand run both show `task.236` and an unsubstituted
  `{next-task-number}` exiting 0. The park conditions they print are
  `task.task.236 merged to develop` and `task.{next-task-number} merged to develop`. An empty
  `TASK_ID` is refused, by the function's own throw.
- **Impact**: step 6 would write a wrong `parked_until` onto every selected entry.
- **Recommendation**: refuse a non-numeric `process.argv[1]` with a one-line message before the
  call, and add a committed test case for it.
- **Priority**: P2

**Issue QA-3: the probe engine cannot reach the block in the shipped file**
- **Severity**: MEDIUM
- **Category**: Security evidence
- **Observation**: the block refuses on repository state, so it is a boundary
  (`probe-boundary-rule.md`). The `fence:` form takes the first `bash` block under a heading. The
  seed block is the second under § 1.1; the scan block at line 190 comes first. The shipped-file
  probe therefore declines with `bad-slot`, and its record
  ([task.236.qa.1.security.run.json](./task.236.qa.1.security.run.json)) shows
  `totals.executed` 0.
- **Impact**: `/finalise`'s zero-guard fails the same record.
- **Recommendation**: give the block a heading of its own, and commit its probe cases so the next
  cycle runs them against the shipped file. A scratch copy with one inserted heading worked: the
  ids slot ran 9/9 cases as their direction requires, 7 hostile refused, 0 escapes.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-3**: an id with 0 hits prints `matches 0 files` both when the file is missing and when it is
  unparseable. Those two cases need different fixes (advisory, `recommendations.future`).
- **Phase 3 box "`npm run ci` green"** is ticked on `ci:fast` evidence (6418 tests, 0 fail); the
  box's own note says so. The full `npm run ci` runs as `develop-next`'s merge gate.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
The new test takes 0.351 s on the PR head at load 1.15, against a 5 s bound.

### Reliability — CONCERNS
QA-1: the suite fails from a linked worktree.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned. The shipped-file probe executed 0 cases (QA-3). The runs below used a
  scratch copy, not the shipped file, so they are not counted.
- **Probes executed**: 0 (shipped file)
- **Escaped**: 0
- Scratch copy (`#### Seed block` inserted before the fence; the require closure plus
  `read-config.sh` as fixture files; a repo-local workspace; an unused fake `gh`):
  - `{observation-ids}` slot: 9 executed, 9 scored as their direction requires. All 7 hostile
    inputs were refused with the exact message: `1;2`, `../1`, empty, `-1`, `1e2`, `0x1`, and a
    missing id `1,9`.
  - `{next-task-number}` slot, ids filled: 4 executed. `task.236` and `{next-task-number}` were
    accepted (QA-2); empty was refused.
- The id/prefix mismatch refuses by an uncaught throw whose stack trace names the case directory,
  so it has no exact `expected.stderr`. The committed control test holds it instead.

### Maintainability — PASS
One block, one call, and the test substitutes placeholders by split/join. Validate and
`bundle:check` are clean.

---

## Code Review

Blocking resolved `true`: the pipeline passed `code_review_blocking=true`, and the frontmatter has
no flag. Anchors were checked with `finding-anchors.js --rev HEAD`, which returned `ok` for all 3.

**Correctness bugs (3):**
- [medium/high] `skills/create-task/tests/seed-step-block.test.js:45` — platform-variance: the
  worktree refusal. Reproduced. **Promoted → QA-1.**
- [medium/medium] `skills/create-task/SKILL.md:213` — TASK_ID is never validated. The probe
  reproduced it. **Promoted → QA-2** by the boundary rule (an executed case that scored against
  its direction), not by confidence.
- [low/medium] `skills/create-task/SKILL.md:224` — a 0-hit id conflates missing and unparseable.
  Advisory.

**Cleanups (0).**

**Boundary**: `boundary: true`. Shipped-file `probes_executed: 0` (`bad-slot`, QA-3); `escaped: 0`.

**Mutation proofs:**
- `mutation-proven: drop { taskId } from the block → seed-step-block test 1 (and the control) red → covered`
  The spot check was done in the main tree after the reviewer returned: SKILL.md was snapshotted
  with `cp`, the mutation's count was asserted as 1, and the file was restored from the snapshot.
  Baseline green: 2/2. `git status` was unchanged.
- The develop step's other two proofs (a per-entry loop, `|| true`) are recorded in the
  implementation report and were not re-run here: 1 of 3 re-proven.

**Step 4b** (`qa-execute-snippets.mjs`, `--diff-base` merge base, `--copy-as skills:.agents/skills`):
- Changed: 1 block. Executed 0, `mutating` 1 (line 211: the resolver helper "sources a
  non-literal path").
- File: 6 blocks, all `mutating`, 0 placeholder. Refusals: helper not a literal path ×3,
  `references/resolve-platform.sh` not in the copy ×1, `mkdir` ×1, `node` ×1.
- Finding `changed-blocks-not-executed` (medium confidence): advisory. A committed test executes the
  block itself.
- Note `no-executable-blocks`; shells: bash only (`zsh-unavailable`, no zsh on this host).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `skills/create-task/tests/*.test.js` | 46/46 PASS |
| `from-observation.test.js` from a linked worktree | 15/15 PASS |
| `seed-step-block.test.js` from a linked worktree | 0/2, FAIL (QA-1) |
| `npm run validate -- skills/create-task/` | PASS |
| `npm run bundle:check` | PASS |

---

## Test Artifacts

### Files Reviewed
`skills/create-task/SKILL.md` § 1.1, `skills/create-task/tests/seed-step-block.test.js`,
`skills/create-task/scripts/lib.js` (`seedFromObservations`), `CHANGELOG.md`, the task docs.

### Test Commands Executed
```bash
command node --test --test-reporter=tap skills/create-task/tests/*.test.js
npm run -s validate -- skills/create-task/
npm run -s bundle:check
./node_modules/.bin/prettier --check skills/create-task/tests/seed-step-block.test.js
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
git worktree add --detach ../agent-skills-t236-probe HEAD    # then the two suites from inside it
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:skills/create-task/SKILL.md#1.1 Entry from the Observation Log (`--from-observation`)' --slot '{observation-ids}' --name seed-ids --cases-file <cases> --repo-root "$PWD" --record docs/tasks/task.236.create-task-seed-step-call/task.236.qa.1.security.run.json --json
```

### Coverage Report
Not instrumented. Both new tests run the block end to end.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1: scratch base under the main checkout (P2).
2. QA-2: validate `TASK_ID` in the block (P2).
3. QA-3: give the block its own heading; commit its probe cases (P2).

### Short-term Actions (Non-Blocking)
1. CR-3: tell a missing file apart from an unparseable one.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high findings. Three medium findings, each with a known and local fix.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1, QA-2 and QA-3 fixed and re-gated.

---

**QA Report**: co-located at `task.236.qa.1.create-task-seed-step-call.md`
**Gate File**: co-located at `task.236.gate.1.create-task-seed-step-call.yml`
**Next Steps**: `/qa-fix` for QA-1, QA-2 and QA-3, then QA cycle 2.
