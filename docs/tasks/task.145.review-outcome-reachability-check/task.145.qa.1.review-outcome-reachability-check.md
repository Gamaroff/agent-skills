# QA Report: Task 145 - review-task: trace a criterion's stated outcome through the function that decides it

**Task**: [Link to task document](./task.145.review-outcome-reachability-check.md)
**Gate File**: [task.145.gate.1.review-outcome-reachability-check.yml](./task.145.gate.1.review-outcome-reachability-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: CONCERNS

---

## Executive Summary

All four sites carry the outcome-reachability check, and every gate command is green: `ci:fast`,
`bundle:check`, `check:generated` and `quick_validate`. Two medium defects stop a PASS:

- The population test does not hold its "branch that fires" element at 3 of 4 sites (CR-1).
- The review-bug wording asks a pre-fix review about "the fixed code", which reads as flagging every
  bug (QA-2).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1 and QA-2

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 checked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#485, OPEN)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast`, the new test, the mutation matrix)
- [x] Regression Testing (full hermetic suite)
- [x] Security Review (boundary rule: no boundary)
- [x] Code Review (Step 3b, independent Explore reviewer)
- [ ] Manual Testing: n/a (the behavioural hand run is in the implementation report)
- [ ] Performance Testing: n/a beyond test duration

### Review Methodology

The review used direct tools, plus one independent read-only Explore reviewer for the Step 3b diff
code review (whole-branch diff, first review), and the traceability mapper matrix supplied by the
pipeline. The task is small (four prose sites plus one test, Low risk), so no parallel agents were
used. `code_review_blocking=true` came from the pipeline, so high-confidence code-review bugs enter
`top_issues[]`.

Step 4b ran on all four changed SKILL.md files (runnable-prose rule fires: each contains fenced
```bash blocks):

| File | runnable | placeholder | mutating | Result |
| --- | --- | --- | --- | --- |
| review-task | 0 | 1 | 14 | `zero-blocks-executed`: **pre-existing** (identical counts on `origin/develop`) |
| create-task | 0 | 0 | 3 | `no-executable-blocks` (information) |
| review-story | 0 | 4 | 13 | `zero-blocks-executed`: **pre-existing** (identical counts on `origin/develop`) |
| review-bug | 0 | 0 | 1 | `no-executable-blocks` (information) |

The diff adds **0** fenced blocks (`git diff origin/develop...HEAD -- 'skills/*/SKILL.md' | grep -c '^+.*```'`
→ 0). No block changed by this task went unexecuted.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: review-task check 10 | PASS | Verified | Check 10 plus the Common Hallucination Patterns line are present; the worked example and Important/Optional severities are stated. The "check 2's question" cross-reference is wrong (QA-3). |
| Phase 2: authoring and sibling sites | CONCERNS | Verified | create-task and review-story are correct (review-story is check 7, per the review). The review-bug wording does not fit a pre-fix review (QA-2). |
| Phase 3: population test | CONCERNS | Partial | Section and citation assertions are held at every site. The branch element is vacuous at 3 sites (CR-1). |
| Phase 4: docs and validation | PASS | Verified | CHANGELOG cites `(task 145, obs #168)`. All gate commands are green. |

**Overall Phase Completion**: 2/4 phases passed clean, 2 with CONCERNS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| review-task check 10, obs #168, worked example, severities | Present | Present | PASS |
| create-task / review-story / review-bug carry their form | Present | Present; the review-bug form is mis-worded | CONCERNS (QA-2) |
| Test fails when the check is removed from a site, naming it | Red | Red at 4/4 sites (dev mutation proof, re-confirmed with the matrix) | PASS |
| …and when any one element is removed from a site's item | Red | **Green at 3/4 sites for "branch that fires"** | FAIL (CR-1) |
| Test under 1 s, no network | < 1 s | about 135 ms; only `node:fs` / `node:path` imports | PASS |
| Every new assertion mutation-proved | All | Not all: element removal ran at 1 site | CONCERNS (CR-1) |
| `ci:fast`, `format:check`, `bundle --check` clean | 0 | `ci:fast` 3997 pass / 0 fail / 1 skipped; `bundle:check` 0 problems; `check:generated` ok | PASS |
| CHANGELOG cites (task 145) | Yes | Yes | PASS |
| Implementation report records the hand run | Yes | Yes (motivating instance plus an unseen control) | PASS |

---

## Breaking Changes Validation

None declared. The change is additive review guidance and no gate, score cap or verdict rule changes.
Verified: the diff touches only prose, one new test, CHANGELOG and task documents.

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue CR-1: "branch that fires" element assertion is vacuous at three sites**
- **Severity**: MEDIUM · **Category**: Quality
- **Bug Report**: [task.145.bug.1.branch-element-vacuous.md](./task.145.bug.1.branch-element-vacuous.md)
- **Observation**: `/\bbranch/` is met by "decision branches". Replacing "branch that fires" with
  other wording at review-task, review-story or create-task leaves `fail 0`.
- **Recommendation**: `/branch that fires/`, then prove all 12 element mutants red.

**Issue QA-2: the review-bug check asks a pre-fix review about "the fixed code"**
- **Severity**: MEDIUM · **Category**: Functional (review guidance)
- **Bug Report**: [task.145.bug.2.review-bug-prefix-wording.md](./task.145.bug.2.review-bug-prefix-wording.md)
- **Observation**: the branch that fires today is the Actual branch by definition, so a literal
  reading flags every bug as Important.
- **Recommendation**: reword it as whether the Expected outcome is one the function can return for
  the reproduction input. Say that the branch firing today is the Actual.

### LOW Severity Issues (1)

- **QA-3**: review-task's "Whether the function exists is check 2's question" names File Path
  Accuracy. review-story's "the other checks' question" names none. Cite the actual existence checks
  or drop the cross-reference.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The new test takes about 135 ms. There is no runtime code change.

### Reliability — PASS
The heading floor turns a renamed heading red (mutation-proven). The reader robustness gaps CR-3 and
CR-4 are not triggered by any current file and are advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The change set delivers no function whose purpose is to accept or reject input.
  It is prose, plus a test that only reads four repository files.

### Maintainability — CONCERNS
One of the three element assertions is not held at 3 of 4 sites (CR-1).

---

## Code Review

Step 3b ran with an independent Explore reviewer over the whole-branch diff (941 lines, 10 files). It
probed the readers in memory with 9 edge cases.

**Correctness bugs (4):**
- [medium/high] `tests/outcome-reachability-check.test.js` (ELEMENTS) — the branch regex is met by
  "decision branches" → match `/branch that fires/`. **Promoted to gate `top_issues` as CR-1**
  (code_review_blocking).
- [medium/medium] `skills/review-bug/SKILL.md:82` — "the fixed code" in a pre-fix review → reword.
  Not high confidence so not auto-promoted. **Confirmed by QA and entered as QA-2.**
- [low/medium] `tests/outcome-reachability-check.test.js` (`sectionOf`) — a heading copy inside an
  earlier fence, or a four-backtick or tilde fence, inverts fence state and overruns the section.
  Not triggered by any current site. Advisory (CR-3).
- [low/medium] `tests/outcome-reachability-check.test.js` (`citingItemOf`) — a column-0 fence right
  after the item does not end it. Not triggered by any current site. Advisory (CR-4).

**Cleanups (1):**
- `skills/review-task/SKILL.md:857` — the "check 2's question" cross-reference is wrong. **Confirmed
  and entered as QA-3 (low).**

**Boundary rule:** `boundary: false`, `probes_executed: 0`. No accept/reject function is delivered.

**Mutation-proof spot check (Step 3c):**

```markdown
mutation-proven: check item deleted at each of 4 sites → per-site test → covered (dev proof, recorded in implementation report)
mutation-proven: "stated input" removed at each of 4 sites → per-site test → covered (QA 4x3 matrix)
mutation-proven: "named function" removed at each of 4 sites → per-site test → covered (QA 4x3 matrix)
mutation-proven: "branch that fires" phrase removed at review-task, review-story, create-task → no test red → no-red-untested (CR-1)
mutation-proven: "branch that fires" removed at review-bug → per-site test → covered
mutation-proven: review-bug heading renamed → floor test → covered (dev proof)
```

Mutations ran from `cp` snapshots. `git status --porcelain skills/` was empty after each restore.

---

## Regression Testing

The full hermetic suite (`npm run ci:fast`): 3998 tests, 3997 pass, 0 fail, 1 skipped. `bundle:check`
and `check:generated` are clean, and `quick_validate` passes on all four skills. **PASS.**

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run check:generated
python3 skills/create-skill/scripts/quick_validate.py skills/{review-task,create-task,review-story,review-bug}
command node --test tests/outcome-reachability-check.test.js
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<s>/SKILL.md --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: tighten the branch element and prove all 12 element mutants red.
2. QA-2: reword the review-bug bullet for a pre-fix review.

### Short-term Actions (Non-Blocking)
1. QA-3: fix the existence-check cross-reference.
2. CR-3 and CR-4: harden the fence handling in both readers.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings and all gates green. Two medium findings: one test element is not
held, and one site's wording would over-fire.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and QA-2 fixed.

---

**Next Steps**: `/qa-fix` cycle 1 on CR-1, QA-2 and QA-3, then QA cycle 2 (refute pass).
