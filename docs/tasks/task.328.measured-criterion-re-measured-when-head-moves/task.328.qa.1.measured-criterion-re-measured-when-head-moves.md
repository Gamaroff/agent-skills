# QA Report: Task 328 - A measured criterion is re-measured when the head moves

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.1.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.1.measured-criterion-re-measured-when-head-moves.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Testing Completed**: 2026-11-27
**Gate Status**: CONCERNS

---

## Executive Summary

The preflight now lists task 320 criterion 10 and flags measured criteria. Both QA skills cite finalise's grading rule for a measured figure, and a parity test holds them to it. The fast gate is green, and each remedy turns a named test red. Two MEDIUM findings remain: a merged bullet in `qa-task`, and criterion 5 reworded after review with no approver.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed (3/3, 9/9 boxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR #960

### Review Methodology

- First review. Direct tools (standard mode, low risk), plus one Explore diff reviewer.
- Diff review: code review. The patch was `git diff origin/develop...HEAD`, excluding the generated `skills/*/references/` copies (byte copies, held by `bundle:check`) and `docs/tasks/`.
- Reviewer dispatched 2026-11-27T04:12Z and returned in 52315 ms (`duration_ms`). All 3 anchors were `ok`.
- CI on 04827b92a005: pending.
- Step 4b over `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` (`--diff-base` merge base, `--copy-as skills:.agents/skills`): 0 changed blocks in either file. The change adds prose with inline commands only, no fenced blocks. No findings.
- record_criteria: preflight listed #5 and #6 (`location: qa-report`, `measured: false`). Both records are below. No listed entry is measured, so the measured-figure rule grades nothing here.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Detect a measured criterion | PASS | Verified | Regex widened; `measured` set once on the shared `entry` (both push sites carry it) |
| Phase 2: QA grades a measured figure by finalise's rule | CONCERNS | Verified | Paragraph present in both skills; T328-CR-1 merged bullet at `qa-task` line 50 |
| Phase 3: Verify and close | PASS | Verified | Corpus, replay, mutations, bundle, CHANGELOG |

**Overall Phase Completion**: 3/3 delivered, 1 with a finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Task 320 #10 verbatim listed with `measured: true` | test "task 320 criterion 10, verbatim, is listed" in `finalise-record-preflight.test.mjs`; replay below | PASS |
| 2 | Seven comparatives, with and without "no", are record criteria | test looping longer…greater × {"", "no "} | PASS |
| 3 | No-number comparison not listed; no-bound record reads `measured: false` | controls test | PASS |
| 4 | Both skills cite Step 3, "re-measure", not restated; test fails on loss/restatement | `qa-measured-figure-parity.test.mjs` per-skill tests; mutations M3, M4, M5 | PASS |
| 5 | Corpus count with examples by path, in QA report | record below. Wording drift: T328-QA-1 | CONCERNS |
| 6 | Every new test red first; red runs in QA report | record below | PASS |
| 7 | Reverting any remedy turns a named test red; table here | mutation table below | PASS |
| 8 | `npm test` under CI=true; bundle no diff; bundle:check 0 | fast gate 8938/0 fail; `bundle:check` 0 problems | PASS |
| 9 | CHANGELOG cites (task 328) | `changelog-cites.sh task.328` → `cites (task 328)`, exit 0 | PASS |

### Record — criterion 5 (corpus)

Graded against the **reviewed** wording: "The corpus count of newly listed criteria, with five examples by path, is recorded in the QA report".

Command (scratch script, comparing the develop engine to the branch engine across every tracked task document):

```
command node <scratchpad>/corpus.js . <scratchpad>/old/finalise-record-preflight.js shared/resources/finalise-record-preflight.js
```

Output: 333 task documents, 3305 criteria. 375 listed before, 376 after, delta **1**. After the change, 128 listed entries are `measured: true`.

Newly listed examples by path:

1. `docs/tasks/task.320.*/task.320.*.md`, criterion 10

Only one criterion is newly listed. Five examples do not exist, so the reviewed wording cannot be met as written. The reworded text is not used here: see T328-QA-1.

### Record — criterion 6 (red first)

- Engine tests, run against develop's engine: `pass 0 / fail 3`. "longer than 3 units" read `false`, and task 320 #10 listed 0 entries.
- Parity test against develop's prose: the two SKILL.md files were stashed, the test was run, and the stash was popped. 5 of 9 tests failed. The 4 calibration tests pass by design, because they run on synthetic text.

### Replay — task 320

- The preflight on task 320 lists `#10 state ok measured: true` and `#11 state ok measured: false`.
- `finalise-delta.js docs-only --base 7cae65a14 --head 5c9044f38` returns `code-changed`. Under the new rule, a figure carried across that move is **unverified** ("re-measure"). That is the outcome finalise reached, now reached at QA.

---

## Breaking Changes Validation

None. `measured` is a new field. Existing fields, STATES and REASONS are unchanged.

---

## Issues Found

### MEDIUM Severity Issues (2)

**T328-CR-1: the `code_review_blocking=true` bullet is merged into `record_criteria`**
- **Category**: Quality. origin: code-review, reproduced by QA.
- **Observation**: at `skills/qa-task/SKILL.md:50`, the line reads `...written or carried.- \`code_review_blocking=true\` — ...`. On develop, 1 line starts with `` - `code_review_blocking=true` ``. At HEAD, 0 do.
- **Control**: develop's file gives the expected count of 1.
- **Recommendation**: restore the newline.

**T328-QA-1: criterion 5 was reworded after review with no approver**
- **Observation**: during develop, the wording "with five examples by path" was changed to "with every newly listed example by path (up to five)". The Change Log row cites the corpus count, but no approver is named.
- **Why criteria-drift.js says clean**: the review report's `reviewed_blob` b758aeae is not in the object database (`git cat-file` returns "bad object"). The engine therefore fell back to the review commit 04827b92a, which already holds the rewording (`exact: false`).
- **Recommendation**: restore the reviewed wording and append a Change Log row for the revert. Only the owner can approve the rewording.

### LOW Severity Issues (1)

- **T328-CR-2**: `qa-measured-figure-parity.test.mjs:83`. The record_criteria test passed on CR-1. Add an assertion that the line does not contain the next token.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The change adds one alternation per criterion. The corpus run is unchanged in practice.

### Reliability — PASS
The field is additive, and the preflight still always exits 0.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: `boundary: false`, `escaped: 0`, `boundary_signals: []`. The predicate-shaped functions considered were `isRecordCriterion`, `classify` and `NUMERIC_BOUND`. They feed an advisory listing that exits 0 and prevent no action, so they lack the refuse-or-allow signal (same as task 259 gate 1).

### Maintainability — CONCERNS
The rule is cited, not restated, and a parity test holds it. CR-1 and CR-2 are open.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/qa-task/SKILL.md:50`: the code_review_blocking bullet is merged into the record_criteria bullet. Restore the newline. Promoted as T328-CR-1 (reproduced by QA, 5d).
- [low/high] `evals/shared/tests/qa-measured-figure-parity.test.mjs:83`: the token test cannot see a swallowed next token. Add a negative assertion. Promoted as T328-CR-2.

**Cleanups (1):**
- `shared/resources/finalise-record-preflight.js:58`: `(?:no\s+)?` is a no-op in an unanchored `.test()`. Drop it or add a comment. Advisory; listed under `recommendations.future`.

**Mutation table (committed tests; each mutation was edited with the file tool and restored):**

- mutation-proven: drop the comparative alternation from NUMERIC_BOUND → the 3 new engine tests red → covered
- mutation-proven: `measured: false` constant in classify → the same 3 red → covered
- mutation-proven: drop qa-task's Step 3 citation → "qa-task grades a measured figure by finalise's rule, cited not restated" red → covered
- mutation-proven: paste the reason list into qa-story → "qa-story grades a measured figure by finalise's rule, cited not restated" red → covered
- mutation-proven: drop qa-story's Step 3 citation → "qa-story grades a measured figure…" red → covered
- mutation-proven: delete qa-task's record_criteria `measured: true` sentence → "qa-task's record_criteria token sends a measured entry through the rule" red → covered

6 of 6 remedies proven.

---

## Regression Testing

The fast gate (`npm run test:remote`, ci:fast, CI=true, LAN server) ran 8938 tests: 8935 passed, 0 failed. The two changed test files run locally pass 29/29.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run test:remote
command node --test shared/resources/tests/finalise-record-preflight.test.mjs evals/shared/tests/qa-measured-figure-parity.test.mjs
npm run validate -- skills/qa-task/   # ✓
npm run validate -- skills/qa-story/  # ✓
npm run bundle:check                  # 0 problems
bash .agents/skills/qa-task/references/changelog-cites.sh task.328
```

### Coverage Report
Not instrumented. This repository's suites hold no coverage target.

---

## Recommendations

### Immediate Actions (Blocking)
1. Restore the newline before the `code_review_blocking=true` bullet (T328-CR-1).
2. Restore criterion 5's reviewed wording, with a Change Log row (T328-QA-1). The owner then decides whether to approve the rewording.

### Short-term Actions (Non-Blocking)
1. Add the CR-2 negative assertion.
2. CR-3 regex cleanup.
3. Make `review-task` write the `reviewed_blob` object, so criteria-drift.js can use it.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: T328-CR-1 fixed; criterion 5 wording settled by the owner.
