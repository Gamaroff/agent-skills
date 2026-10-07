# Bug Report: Task 170 - The refusal routes disagree between the script, the contract and SKILL.md

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4 review, CR-1 and CR-2)
**Date Found**: 2026-10-03

## Description

1. The contract's halt-7 bullet sends every refused re-entry to the next bullet (`/finalise` at 7),
   including `uncommitted-fix`, which the refusal list, the script header and both SKILL.md
   paragraphs say must never resume at 7.
2. An untracked file is refused as `uncommitted-fix` when nothing is committed, yet Step 4's restored
   held-aside files are the normal state of a branch; a document-only fix there can never reach
   `no-code-moved`, and the script's own message (resume at 7) contradicts the contract (commit,
   never 7). No test covers document-only plus an untracked file.

## Recommendation

One route per reason, stated once: `no-code-moved` and a declined offer → resume at 7;
`uncommitted-fix` (tracked changes only) → commit and re-run; untracked files are listed, never a
refusal of their own. Add the document-only-plus-untracked case.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Fix Description**: each refusal in the contract's list now carries its **Route**, and that list is the routes' one statement — the halt-7 bullet and both SKILL.md paragraphs cite it. `uncommitted-fix` is tracked changes only and routes back to the operator, never step 7. Untracked files are named on every outcome and never refused on (Step 2.6 move: scope the claim — nothing can tell a held-aside file from a new fix file, so the operator decides).

**Files Modified**: `shared/resources/reenter-qa-after-finalise.sh`, `shared/resources/develop-pipeline-resume-contract.md`, both SKILL.md, the suite (untracked-only, document-only-plus-untracked cases), the parity test (route per reason; uncommitted-fix never step 7).

**Testing**: suite 52/52, parity 5/5; refusing on untracked → 3 cases red; routing uncommitted-fix to the next bullet → parity red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 4            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 4        |
| 2026-10-03 | Closed       | QA         | Verified in QA cycle 5         |
