# QA Report: Task 249 - /finalise grades every kind of criterion fairly

**Task**: [task.249.finalise-grades-every-criterion-kind.md](./task.249.finalise-grades-every-criterion-kind.md)
**Gate File**: [task.249.gate.3.finalise-grades-every-criterion-kind.yml](./task.249.gate.3.finalise-grades-every-criterion-kind.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [task.249.gate.2](./task.249.gate.2.finalise-grades-every-criterion-kind.yml), CONCERNS 80/100, with 4 findings. This cycle is scoped to the 11 files changed since gate 2's head, `75152aa4`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T249-QA-3: a graded CI-state criterion cannot be re-graded | ✅ FIXED | `isCiState()` selects DEFERRED-CI and `ci_reading` entries. FAILURE→SUCCESS is tested through the engine and the fence. Mutation (DEFERRED-CI only) → 3 red |
| T249-QA-4: action 2a has no empty-input guards | ✅ FIXED, but see T249-QA-8 | HALTs on an empty STEM, DOD_N, DOC_DIR or AC_OVERALL. Mutation (drop the STEM guard) → red. For a bug run, the guard exposes a placeholder gap |
| T249-QA-5: a missing spec_ref becomes a security FAIL | ✅ FIXED, but see T249-QA-9 | The case is re-dispatched, then becomes a non-gating `spec_questions[]` entry. The re-dispatch wording is incomplete |
| T249-QA-6: the HALT names a recovery that cannot run | ✅ FIXED | The new text is asserted by the fence test |

---

## Executive Summary

Every cycle 2 finding is fixed. The scoped review found one HIGH, which is verified:

- Step 6 action 2a takes any `finalise-ac-merged-${DOD_N}.json` that reads `merged` as this run's.
- That file is keyed by `DOD_N` alone and nothing removes it.
- A bug run skips Step 3c, so it never overwrites the file. A bug run therefore grades another document's criteria and rebinds `AC_OVERALL` from them.

This checkout shows the case live: `finalise-ac-merged-1.json` belongs to task.248, and `-2.json` to task.245.

There are also two MEDIUM findings, both in prose added by cycle 2's fixes:

- The bug-mode STEM placeholder is missing.
- The spec_ref re-dispatch skips item 2's runner.

**Gate: FAIL (60/100).**

---

## Testing Scope

### Prerequisites Verified

- PR #805 is open. Head is `fdb1914b`.
- `npm run ci:fast` at `fdb1914b`: 7034 tests, 0 fail. This is attempt 2. Attempt 1 hit the `bundle-comment-origin` §2 race, logged as obs #145.
- CI on `fdb1914b`: shellcheck, validate and secret-scan pass. `test` was pending at the read.

### Review Methodology

- One read-only Explore code reviewer over the scoped diff. It was dispatched at 21:25:36Z, returned 3 findings in 128 s, and all 3 were verified in-line.
- Boundary probe re-run on `ciResolution`.
- `criteria-drift.js`: clean (base `review-commit`).
- Snippet execution: the changed action 2a block is mutating, so it is not run by the snippet runner. It is executed by the fence tests in `finalise-deferred-ci.test.mjs`, which bind every input.

---

## Issues Found

### HIGH Severity Issues (1)

**T249-QA-7: action 2a grades another work item's merged result** (`skills/finalise/SKILL.md`, the resolve branch of Step 6 action 2a)

Verified with `jq '.record.document'` on the two state files present:
- `finalise-ac-merged-1.json` belongs to `docs/tasks/task.248…`.
- `finalise-ac-merged-2.json` belongs to `docs/tasks/task.245…`.

What happens on a bug run with `DOD_N=1`:
1. Step 3c is skipped, so the file is not rewritten.
2. Action 2a finds `reason: merged` and runs `resolve-ci` on task.248's criteria.
3. `resolve-ci` rewrites that file and rebinds `AC_OVERALL`.

The fence test for bug mode runs in a fresh `mkdtemp` directory, so it cannot see this.

**Fix:** take the resolve branch only when this run's AC record exists and the payload's `record.document` is this work item. Add a fence test that plants a foreign merged file.

### MEDIUM Severity Issues (2)

**T249-QA-8: no bug-mode STEM in action 2a.** The placeholder reads `{story.{P}.{E}.{S} | task.{id}}`. Steps 0, 3b.1 and 7 also offer `bug mode: the bug prefix`. Without that option, a bug run has no stem to substitute and hits cycle 2's empty-STEM HALT, where the prose promises a skip.

**T249-QA-9: the spec_ref re-dispatch skips the runner.** Item 3a reads `spec_ref` from the cases files that item 2's runner writes. "Re-run this step on it" re-reads the first plan's files, so a corrected case still reads as unanchored.

### LOW Severity Issues (0)

---

## NFR Assessment

- **Performance**: PASS. There is no hot path.
- **Reliability**: FAIL. T249-QA-7 and T249-QA-8.
- **Security**: PASS, measured. `ciResolution` probe: 13 executed, 0 reproduced, 0 escaped. Record: [task.249.qa.3.security.run.json](./task.249.qa.3.security.run.json).
- **Maintainability**: PASS.

---

## Recommendations

Fix T249-QA-7 and T249-QA-8 together in the action 2a block, then T249-QA-9 in item 3a. After that, re-review.
