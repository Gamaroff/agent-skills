# QA Report: Task 145 - review-task: trace a criterion's stated outcome through the function that decides it

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Gate File**: [task.145.gate.6.review-outcome-reachability-check.yml](./task.145.gate.6.review-outcome-reachability-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 6 is the one cycle granted after the loop-limit HALT. It gates the cycle-5 fix `c02048a6`,
which no gate had read. All three cycle-5 findings are fixed, and the suite and bundle check are
green. One new medium: the fix for CR5-3 loosened `NAMED_PHASE` until it holds only the verb, so a
reworded naming sentence passes. Two mutations confirm it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR6-1)

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR5-1: stacked QA Testing Results / Change Log block | FIXED | Exactly one `## QA Testing Results` (line 302) before `<!-- change-log-start -->`, and one `## Change Log` directly above its table. All 14 rows are present. |
| CR5-2: shared pattern-line hold accepts either check number | FIXED | `patternLine(10)` at review-task and `patternLine(7)` at review-story. Swapping the check number at either site turns the test red (M1, M2). The items are numbered 10 and 7 in each Step's list. |
| CR5-3: "Cite that phase in the finding" has no finding at create-task | FIXED, with a new medium | The wording is per site. Loosening the hold to allow per-site wording left it holding only the verb (CR6-1). |

## New Findings This Cycle

- **[medium]** `tests/outcome-reachability-check.test.js:66`: `NAMED_PHASE` holds only `Name that \1`. A reworded or hedged naming sentence passes (M3, M5). Make the naming sentence a per-site hold (CR6-1, [bug 11](./task.145.bug.11.named-phase-hold-verb-only.md)).
- **[medium, advisory]** `skills/review-task/SKILL.md:862`, `skills/review-story/SKILL.md:955`: "Name that phase when you pass the criterion" gives no place to record it (CR-2).
- **[medium, advisory]** `skills/create-task/SKILL.md:433`: "Name that phase in the criterion." sits directly before the exclusion of a criterion that promises a later phase (CR-3).
- **[low, advisory]** `tests/outcome-reachability-check.test.js:87`: the check numbers are hard-coded rather than read from the item (CR-4).
- **[low, advisory]** bug 10's fix description claims a writer change no skill carries. The follow-up is task.155 (CR-5).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#485, OPEN; CI green on HEAD `e1f4c34f`)

### Testing Approach

- [x] Automated Testing (`ci:fast`, `bundle:check`)
- [x] Regression Testing
- [x] Security Review (boundary rule: no boundary)
- [x] Code Review (read-only Explore reviewer, scoped diff)
- [x] Mutation proofs (5)

### Review Methodology

Direct tools (re-review), plus one read-only Explore code reviewer over the scoped diff.

Re-review scope: since 2026-09-24T23:14:51Z (default)

The prior gate's security axis read `PASS` / `reasoned`, so `SAFETY_REPROBE=false`. Cycle 6 is not
cycle 2, so there was no refute pass. The scoped diff covers 9 files (1381 lines) changed since
gate 5. The reviewer also read the whole `c02048a6` diff for `skills/` and `tests/`.

Step 4b: ran over the three changed SKILL.md files. create-task has 3 blocks, all `mutating`
(`no-executable-blocks`, information). review-story has 17 blocks: 4 placeholder, 13 mutating.
review-task has 15 blocks: 1 placeholder, 14 mutating. Both have 0 runnable (`zero-blocks-executed`).
bash and zsh are both available. The same pre-existing result was recorded in cycles 1–5. No fenced
block is inside this cycle's diff, which changed prose lines and one test file.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: review-task check 10 | PASS | Verified | Pattern line cites check 10 and is held per site (M1) |
| Phase 2: authoring and sibling sites | PASS | Verified | review-story check 7 is held per site (M2, M4). create-task's wording is advisory (CR-3) |
| Phase 3: population test | CONCERNS | Partial | 11/11 tests pass, but the naming sentence is held by verb only (CR6-1) |
| Phase 4: docs and validation | PASS | Verified | `ci:fast` and `bundle:check` green |

**Overall Phase Completion**: 4/4 implemented; 1 with an open concern

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| All tests passing | 100% | 4002/4003 pass, 0 fail, 1 skipped | PASS | `npm run ci:fast` (format check + test), EXIT 0 |
| Bundle freshness | 0 problems | 129 skills, 0 problems | PASS | `npm run bundle:check` |
| Four sites carry the check, held by the population test | Held | Held; the naming sentence is held by verb only | CONCERNS | CR6-1 |
| No regressions | 0 | 0 | PASS | |

---

## Breaking Changes Validation

None. The change is to review prose and adds one test.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The loosened NAMED_PHASE hold no longer checks the naming sentence**
- **Severity**: MEDIUM
- **Category**: Quality (test strength)
- **Bug Report**: [task.145.bug.11.named-phase-hold-verb-only.md](./task.145.bug.11.named-phase-hold-verb-only.md)
- **Observation**: M3 (create-task back to "in the finding" with only the verb changed) and M5 (review-task hedged) both leave the suite green.
- **Impact**: The test no longer guards what the cycle-5 fix changed.
- **Recommendation**: Hold each site's naming sentence with a per-site factory.
- **Priority**: P2

### LOW Severity Issues (2, advisory)

- CR-4: the pattern-line check numbers are hard-coded.
- CR-5: bug 10's fix description overstates the writer change. The follow-up is task.155.

**Total Issues**: HIGH: 0, MEDIUM: 1 (plus 2 advisory mediums), LOW: 2

---

## NFR Assessment

### Performance — PASS
The population test runs in about 100 ms.

### Reliability — PASS
The document block is restored. No behavioural contradiction remains across the four skills.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The change set delivers no accept/reject function; it is review prose and a test.

### Maintainability — PASS
The document structure is restored. The test-strength gap is carried as CR6-1.

---

## Code Review

Advisory, except that code_review_blocking is set by the develop-task pipeline: CR-1, a
high-confidence bug, is promoted to gate `top_issues[]` as **CR6-1**.

**Correctness bugs (5):**
- [medium/high] `tests/outcome-reachability-check.test.js:66`: NAMED_PHASE holds only the verb. A reworded, hedged or reverted naming sentence passes. → Per-site factory. **Promoted: CR6-1.**
- [medium/medium] `skills/review-task/SKILL.md:862`: "Name that phase when you pass the criterion" has no place to be recorded. The report templates have only Critical/Important buckets. → Add a slot or say where it goes.
- [medium/medium] `skills/create-task/SKILL.md:433`: "Name that phase in the criterion." sits directly before the exclusion of a criterion that promises a later phase. → Reword it so the criterion's pointer is only a cross-reference.
- [low/medium] `tests/outcome-reachability-check.test.js:87`: `patternLine(10)`/`patternLine(7)` hard-code the check number. → Read it from the citing item's list marker.
- [low/medium] `task.145.bug.10…md:42`: the fix description claims a writer change that no skill carries. → Limit it to the one-off rebuild; task.155 owns Step 12.

**Cleanups (0).**

Provenance (5b): CR-1 is new to this change. `c02048a6` introduced the loosened pattern, and gate 5's
pattern held the full sentence.

Boundary rule: `boundary: false`, so `probes_executed: 0`. Platform variance: not applicable, since
no environment-derived value reaches a validating consumer.

mutation-proven: review-task pattern line "check 10" → "check 7" → outcome-reachability-check.test.js (review-task site) → covered
mutation-proven: review-story pattern line "check 7" → "check 10" → outcome-reachability-check.test.js (review-story site) → covered
mutation-proven: create-task "Name that phase in the criterion." → "…in the finding." → none red → no-red-untested (CR6-1)
mutation-proven: review-story exclusion sentence removed → outcome-reachability-check.test.js (NAMED_PHASE) → covered
mutation-proven: review-task naming sentence hedged ("only if the author asks") → none red → no-red-untested (CR6-1)

Baseline was green before and after. Every file was restored from its `cp` snapshot. `git status
--porcelain` matched its pre-step state before the gate was written.

---

## Regression Testing

The full `ci:fast` suite passes (4003 tests; 0 fail), and so does `bundle:check`. PR #485 CI is
green: test, validate, link-check and shellcheck. `origin/develop` has moved two docs-only commits
ahead (task 155 creation and a task.148 doc). Nothing on the branch touches those files.

---

## Test Artifacts

### Files Reviewed
- `tests/outcome-reachability-check.test.js`
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`
- `docs/tasks/task.145.review-outcome-reachability-check/task.145.review-outcome-reachability-check.md`
- `docs/tasks/task.145.review-outcome-reachability-check/task.145.bug.10.task-doc-stacked-sections.md`

### Test Commands Executed
```bash
npm run ci:fast            # EXIT 0 — tests 4003, pass 4002, fail 0
npm run bundle:check       # EXIT 0 — 129 skills, 0 problems
command node --test tests/outcome-reachability-check.test.js   # baseline + 5 mutations
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <SKILL.md> --json
```

### Coverage Report
Not applicable. The deliverable is prose, held by a population test.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR6-1: make the naming sentence a per-site hold (P2).

### Short-term Actions (Non-Blocking)
1. CR-2: give the passing-phase note a slot in the review templates.
2. CR-3: reword create-task's naming sentence.
3. CR-4: derive the pattern-line check number from the item.
4. CR-5: bug 10 wording. The Step 12 writer is task.155.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH. One medium from the code review, a high-confidence bug entered under code_review_blocking.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR6-1 fixed

Bugs 1–10 were verified and closed this cycle. Bug 11 is new.

---

**QA Report**: co-located at `task.145.qa.6.review-outcome-reachability-check.md`
**Gate File**: co-located at `task.145.gate.6.review-outcome-reachability-check.yml`
**Next Steps**: The orchestrator routes the gate. The granted cycle budget (6) is now spent.
