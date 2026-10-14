# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 2)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.2.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.2.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Testing Completed**: 2026-10-08
**Gate Status**: CONCERNS

---

## Executive Summary

The refute pass confirmed every cycle-1 fix and found no HIGH. It found three MEDIUM defects, two of
them consequences of this branch's own changes in states the suite never entered: a resume after a
PreCompact pause between 5c and 6a, and an error or recovery path that destroys the carried set.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 carry restore wipes uncommitted work | FIXED | classify clears only tracked + clean, non-report paths; the not-cleared test leaves the implementation report byte-identical |
| CR-2 classifier silent on unparsed findings | FIXED (residue: CR2-6) | count check; four parse-failure cases |
| CR-3 CARRY_FIXED placeholder | FIXED | quoted placeholder guard, both shells |
| CR-4 6a CARRIED string compare | FIXED | pathspec-normalised EXPECTED; absolute and `./` cases |
| CR-5 overclaim about HALT commits | FIXED | step doc and task document reworded |

---

## Testing Scope

### Review Methodology

Cycle 2: a full refute pass over the whole branch diff (`origin/develop...HEAD`, 808 lines). As in
cycle 1, it excluded the generated `skills/*/references/` byte copies and the work item's own
`docs/tasks/` files. One Explore reviewer ran with the refute directive. Reviewer duration 289.9 s
(the completion notice's `duration_ms`).

Re-review scope: unscoped — cycle 2 refute pass (whole branch diff).

CR2-1 was verified by reading `develop-pipeline-resume-contract.md` § "Working-tree probe": a staged
`A` entry the base does not have falls to class (c), which HALTs `dirty tree on resume`. Before this
branch, the bare pause commit had swept the staged review report, so the probe saw a clean tree.

Step 4b: unchanged from cycle 1. The changed blocks are deny-listed (`git add`/`git checkout`) and are
executed by `acceptance-commit-carries-5c.test.mjs` under bash and zsh.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1515` — a resume after a pause between 5c and 6a HALTs at the Phase 0b probe on the staged 5c set → teach the probe to set the set aside, and add a resume test.
- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1498` — any non-zero `doc-links.js` exit restores the file → restore only on exit 1, HALT otherwise.
- **[medium]** `skills/finalise/SKILL.md:2705` — the 8a hint `git reset --hard` destroys the carried set → use a soft reset plus a path-limited restore.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1502` — a duplicate path in `CARRY_FIXED` gets two outcomes.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1433` — re-running classify after the edits empties the eligible list.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1447` — the findings block ends at the first triple backtick anywhere.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | CONCERNS | the narrowed pause commit exposes CR2-1 at resume |
| Phase 2 | CONCERNS | CR2-2, CR2-4, CR2-5, CR2-6 |
| Phase 3 | PASS | CR-4 closed |
| Phase 4 | CONCERNS | CR2-3 recovery-hint prose |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 3 — see the gate's `top_issues[]`. MEDIUM findings with
`confidence: high` (CR2-1, CR2-2) and the LOW with `confidence: high` (CR2-4) were promoted under
`code_review_blocking`. QA adopted CR2-3, CR2-5 and CR2-6 after reading each one. No bug files: none
is HIGH, and the two MEDIUMs promoted under `code_review_blocking` are tracked in the gate.

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
The resume HALT regression and two destructive error/recovery paths.
### Security — PASS
- **Evidence**: reasoned · **Probes executed**: 0 · `boundary: false`. The accept/refuse decision
  delegates to `isDocsPath` (task.172) plus a git test for tracked and clean. No new predicate.
### Maintainability — PASS

---

## Code Review

**Correctness bugs (6):** the six findings above, with these anchor checks: all six `ok` (each cited
line holds the reviewer's quoted text at `HEAD`). Provenance: CR2-1 is caused by this branch (the
pause commit was narrowed). The other five are in lines this branch added.

**Cleanups (0).**

mutation-proven: the six cycle-1 fix proofs recorded in cycle 1's fix pass (CR-1 ×3, CR-2, CR-3,
CR-4) → acceptance-commit-carries-5c → covered.

---

## Regression Testing

Fast gate at `c8733a5a`: 5,530 tests, 0 failures.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL — CR2-1 to CR2-3 must be fixed.

**Next Steps**: `/qa-fix` cycle 2.
