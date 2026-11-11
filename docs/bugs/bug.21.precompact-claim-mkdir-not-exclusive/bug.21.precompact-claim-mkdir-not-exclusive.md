---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-11-11'
related: 'none — cross-cutting (no single owner)'
description: 'The PreCompact hook claims the pause with mkdir, which is not exclusive on some kernels, so two concurrent runs both append a pause block and CI Test goes red'
---

**Bug ID**: bug.21.precompact-claim-mkdir-not-exclusive
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-11-11
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: `shared/resources/develop-pipeline-on-precompact.sh` claims the pause with `mkdir "$CLAIM_DIR"` (line 177), on the premise that `mkdir` is atomic and exclusive. On the kernels below two concurrent `mkdir` calls of the same name both return success, so both hook runs take the claim and both run the whole pause flow.

**Expected Behavior**: of N concurrent hook runs, exactly one takes the claim and appends one `## Pipeline Paused` block; the rest exit 0 with the empty signal.

**Actual Behavior**: both runs take the claim. The report gets two `## Pipeline Paused` headings, and both runs run the report lint, the commit and the tracker calls.

**Impact**: the Test workflow is red on `develop` (commits `e5d32eab` and `b767b065`, both docs-only) and on every PR head, so no PR can show a green check. In a real session a doubled pause entry, commit and tracker comment is possible when two PreCompact hooks fire together (the situation task.110 and task.120 were written for).

---

## Reproduction Steps

**Environment**: LAN server `ci@192.168.1.249`, WSL2 kernel 6.18.33.2-microsoft-standard-WSL2, 8 cores, idle (load 0.3). The laptop kernel does not reproduce it. The GitHub runners are not measured, but the CI failure matches (see Evidence).

**Steps to Reproduce**:

1. Sync the tree to the server. From the repository root run `bash shared/resources/develop-pipeline-on-precompact.test.sh` 12 times.
2. Read the result line of each run.
3. To isolate the primitive, run two concurrent `mkdir` calls of one name, 300 times, and count the runs where both return 0 (script kept by the reporter in the task 304 scratchpad; five lines of bash).

**Frequency**: Sometimes (7 of 12 runs of the test on the LAN server).
**Reproducible**: Yes on the affected kernel, No on the laptop kernel.

---

## Evidence

**Test output** (LAN server, 12 runs): 7 runs end `Results: 30 passed, 1 failed` with `FAIL concurrent: exactly one report block appended`, 5 runs end `31 passed, 0 failed`.

**Trace** (a copy of the hook that logs the claim decision): in every failing run both processes logged `won-claim` within microseconds of each other and neither logged `lost-claim`.

**Primitive race, 300 iterations each, count of runs where both racers succeeded**:

| Primitive | LAN server (ext4) | LAN server (tmpfs) | Laptop (tmpfs) |
| --- | --- | --- | --- |
| `mkdir` | 298 | 228 to 255 | 0 |
| `set -o noclobber` file create | 0 | not run | 0 |
| `ln src dst` | 0 | not run | 0 |
| `ln -s x dst` | 0 | not run | 0 |

**CI**: Test workflow on `develop` passed at `98d6529e`, failed at `e5d32eab` and `b767b065` (docs-only commits, run 42959047359), and failed on PR #876 heads `d611a3c7` and `abe0575b` with the same message: `found 2 '## Pipeline Paused' headings`. The hook itself last changed in `840b85f4` (2026-11-10), before the passing run, so the change is in the environment, not the code.

**Related Files**:

- `shared/resources/develop-pipeline-on-precompact.sh` (claim at line 177, stale-steal at lines 181 to 208, release trap at 211)
- `shared/resources/develop-pipeline-on-precompact.test.sh` (the concurrent scenario, around lines 405 to 445)
- bundled copies under `skills/develop-{bug,story,task}/references/` (regenerate with `npm run bundle`, never hand-edit)

---

## Scope & Impact

**Reference**: the pipeline pause machinery (`develop-pipeline-on-precompact.sh`, `advance-pipeline-lock.sh`, the Stop hook) and the CI Test workflow.

**How It Failed**: the design (task.120, task.110) relies on `mkdir` being an atomic claim. That holds on most kernels and is false on at least one current one. It belongs to no single story or task: it is a shared-hook defect that surfaced as a red CI check during task 304. A search of tracked shell for `mkdir` used as a lock (`git grep` for `if mkdir` / `mkdir … || return` on `LOCK` and `CLAIM` names) finds only this hook.

**Suggested fix** (not decided; `review-bug` and `develop-bug` own the design): claim by an exclusive file create (`set -o noclobber`) or `ln`, both measured exclusive on the affected kernel. Keep the pid record and the stale-claim steal. The steal currently renames the claim directory, so it needs the same exclusivity. Add a regression test that reproduces the double claim by calling the claim step from many concurrent racers and asserting exactly one wins, and prove it red against the `mkdir` claim on the affected kernel or against a stand-in that returns success twice.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By | Notes                                   |
| ---------- | ------ | ---------- | --------------------------------------- |
| 2026-11-11 | New    | Claude     | Bug created, found during task 304 DoD |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
