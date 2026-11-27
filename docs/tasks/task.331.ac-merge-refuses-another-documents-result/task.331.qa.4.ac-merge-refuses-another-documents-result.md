# QA Report: Task 331 - The AC merge refuses another document's result (cycle 4)

**Task**: [task.331.ac-merge-refuses-another-documents-result.md](./task.331.ac-merge-refuses-another-documents-result.md)
**Gate File**: [task.331.gate.4.ac-merge-refuses-another-documents-result.yml](./task.331.gate.4.ac-merge-refuses-another-documents-result.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Gate Status**: PASS

---

## Executive Summary

This is a re-review at head `e22028a2c8a9`, after `/finalise` DoD run 1 found gap #7: the Step 3c `result-document-mismatch` arm had no test. The new eval test reaches that arm under bash and zsh, asserts the arm's own remedy text, and is mutation-proven. The scoped review found nothing new, and the fast gate on the head is green.

**Overall Assessment**: PASS
**Deployment Recommendation**: CONDITIONAL (CI green on the pushed head)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| DoD run 1 gap #7: Step 3c `result-document-mismatch` arm untested | ✅ FIXED | `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, test "Step 3c HALTs on another document's result in its own arm…" (bash, zsh). Mutation below |

Gate 3 carried no open findings.

## New Findings This Cycle

None. Searched with the default scope: 8 files changed since gate 3 (head `f35403b82a8d`). The only code among them is the eval test file. The reviewer checked three things against `skills/finalise/SKILL.md:1063-1080` and the merge handler in `finalise-rerun-scope.js`: that the fixture reaches this arm and not another refusal, that the asserted strings are the ones printed, and that the test leaves nothing behind.

### Review Methodology

Re-review scope: files changed since gate 3 (head f35403b82a8d; 8 files) — default. An independent Explore subagent ran the code route over the scoped diff. It was dispatched at 17:01:25Z and returned at 17:02:28Z (`duration_ms` 50696). Diff review: code review.

Direct tools: re-review strategy.

Fast gate on the head: `CI=true npm run test:remote` (ci:fast on the CI-parity server): 8968 tests, 8965 pass, 0 fail. The first attempt ended with status 255 when the ssh session to the server dropped ("No route to host"). That was an environment failure, not a result. I removed that run's stale container and lock, and the re-run passed.

The test file alone, `node --test evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`: 14/14.

CI on e22028a2c8a9: pending.

Step 4b: not applicable this cycle. No runnable prose changed since gate 3, and `skills/finalise/SKILL.md` is unchanged since cycle 3, which executed its Step 3c block.

Record criteria: #5 ("every § 8 mutation recorded with the test it turned red") was recorded in QA report 1. This cycle's mutation is recorded below in the same form.

---

## Code Review

Reviewer: 0 findings (0 bugs, 0 cleanups).

mutation-proven: deleted the `result-document-mismatch)` arm from `skills/finalise/SKILL.md` Step 3c (Edit tool, snapshot with `cp`) → `[bash] Step 3c HALTs on another document's result in its own arm, naming the remedy, and records nothing (task 331)` and its `[zsh]` twin went red, 12/14 → covered. Restored: `cmp` clean, 14/14.

Boundary: `internal`, unchanged from gate 3. This cycle adds a test only.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Next Steps**: 5c `/review-pr`, then `/finalise` DoD run 2.
