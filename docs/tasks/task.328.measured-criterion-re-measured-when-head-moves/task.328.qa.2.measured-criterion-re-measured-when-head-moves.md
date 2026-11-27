# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 2)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.2.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.2.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.1.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.1.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-CR-1 merged bullet | ✅ FIXED | 1 line starts with `` - `code_review_blocking=true` `` at 4fc09e876; the refute pass confirmed |
| T328-CR-2 parity test blind to CR-1 | ✅ FIXED | merged line put back → `qa-task's record_criteria token…` red; restored, `cmp` clean |
| T328-QA-1 criterion 5 reworded without approver | ⚠️ PARTIAL | reviewed wording restored; the criterion is now unmet and needs the owner |

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-record-preflight.js:58`: "greater than or equal to 5" is not listed. → Accept an optional "or equal to" (T328-CR2-2).
- **[medium]** `skills/qa-task/SKILL.md:1098` and qa-story: the paragraph paraphrases Step 3 and narrows it. → Cite, don't restate (T328-CR2-3).
- **[low]** `shared/resources/finalise-record-preflight.js:58`: "faster than 319" reads as a bound, a false positive this change introduced (T328-CR2-4).

### Review Methodology

- Cycle 2 = **refute pass** over the whole branch diff, excluding the generated `skills/*/references/` copies and `docs/tasks/`. Reviewer returned in 111075 ms (`duration_ms`).
- Diff review: code review.
- CI on 4fc09e876341: green after one rerun. The first read was `1 failed (0 pre-existing)`, in `lockctl take is atomic` (tests/test-remote-runner.test.js:1047). That test is outside the change set, passed on the LAN gate, and passed on rerun, so it is a flake and goes to `recommendations.future`.
- Step 4b: unchanged since cycle 1 (0 changed fenced blocks).

## Reproductions (QA, by execution)

```
NUMERIC_BOUND.test("The suite is greater than or equal to 5 tests.")  → false   (develop: false)
NUMERIC_BOUND.test("The new engine is faster than 319 was.")          → true    (develop: false)
classify(["The new engine is faster than 319 was."])[0].measured      → true
```

CR2-3 was checked against its source: finalise-dod-ac-prompt.md, the "A measured criterion" bullet. That bullet says the head-or-docs-only-M rule applies to "A wall-clock bound" and requires the load recorded beside the timing.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–4, 6–9 | PASS | as cycle 1; fast gate at 4fc09e876 ran 8938 tests, 0 failed |
| 5 | **FAIL** | reviewed wording "with five examples by path": the corpus has 1 newly listed example (task 320 #10; 375 → 376). Owner decision needed (T328-QA-1) |

## Code Review (refute pass)

**Correctness bugs (5):**
- [medium/medium] `shared/resources/finalise-record-preflight.js:130`: `measured` also marks behaviour bounds. Advisory, not promoted (medium confidence, not reproduced as a defect); listed in `recommendations.future`.
- [medium/high] `shared/resources/finalise-record-preflight.js:58`: misses "or equal to". Promoted as T328-CR2-2.
- [medium/medium] `skills/qa-task/SKILL.md:1098`: paraphrase narrows Step 3. Promoted as T328-CR2-3 (checked against the source).
- [low/medium] `shared/resources/finalise-record-preflight.js:58`: an id after "than" reads as a bound. Promoted as T328-CR2-4 (reproduced).
- [low/medium] `skills/qa-task/SKILL.md:1099`: "from the repository root" omitted. Advisory, future.

**Cleanups (1):**
- `shared/resources/tests/finalise-record-preflight.test.mjs:219`: the "with a leading no" half is vacuous. Advisory, future.

mutation-proven: merged the record_criteria/code_review_blocking bullets again → `qa-task's record_criteria token sends a measured entry through the rule` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability CONCERNS (CR2-3).

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL. Criterion 5 needs the owner, and CR2-2 and CR2-3 need a fix cycle.
