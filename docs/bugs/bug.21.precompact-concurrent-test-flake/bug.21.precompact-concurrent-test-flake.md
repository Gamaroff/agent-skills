---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-11-11'
related: 'none — cross-cutting (no single owner)'
description: 'develop-pipeline-on-precompact.test.sh "concurrent: exactly one report block appended" fails on the GitHub hosted runner only, reddening test on develop and on every PR'
---

**Bug ID**: bug.21.precompact-concurrent-test-flake
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-11-11
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: The concurrency assertion `concurrent: exactly one report block appended` in `shared/resources/develop-pipeline-on-precompact.test.sh` fails on the GitHub hosted runner (`test` job, "Hermetic test suite (L1–L4)") and passes everywhere else it has been run: locally, under load, and in the CI-parity container on the LAN server.

**Expected Behavior**: Of two concurrent runs of `develop-pipeline-on-precompact.sh`, exactly one passes the `mkdir` claim and appends one `## Pipeline Paused` block to the report; the other emits the empty or repeat signal.

**Actual Behavior**: On the hosted runner the report holds two `## Pipeline Paused` headings. Both runs got past the claim and each wrote a block.

**Impact**: The `test` check is red on `develop` and on any PR whose run hits it, so a green-CI merge gate cannot be satisfied. It also exposes a second hazard: `/finalise` CI reading 2 wrote `SUCCESS` from tree-equivalence to an earlier green commit while the head's own `test` check was red (see Scope & Impact).

---

## Reproduction Steps

**Environment**: GitHub Actions hosted runner (`test.yml`, job `test`). Not reproduced on Arch Linux (bash 5.3) or in the `scripts/remote-test` container (`node:22-trixie`, LAN server).

**Steps to Reproduce**:

1. Push any commit to a branch off `develop` (the diff does not matter; the failing commits changed only `docs/`).
2. Wait for `test.yml` to run.
3. Read the log: `gh run view <id> --log-failed | grep -E "FAIL  |Results:"`.

**Frequency**: Sometimes (see Evidence: 6 failing runs, at least 4 passing runs, in one day)
**Reproducible**: Intermittent, hosted runner only

---

## Evidence

**Failing hosted runs** (all assert `found 2 '## Pipeline Paused' headings`, `Results: 30 passed, 1 failed`):

| Run | Branch | Head | Time (UTC) |
| --- | --- | --- | --- |
| 42892322210 | `develop` | — | 2026-11-10 20:08 |
| 42895515234 | `develop` | — | 2026-11-10 20:27 |
| 42895792179 | `develop` | — | 2026-11-10 20:29 |
| 42907987985 attempt 1 | `feature/task.294.qa-snippet-classifier-allow-list` | `3e0e47c2` | 2026-11-10 21:46 |
| 42907987985 attempt 2 | same | `3e0e47c2` | 2026-11-11 03:36 |

**Passing hosted runs**: `42904804943` (task 294 branch, `291d7750`, 2026-11-10 21:24), `42889073453` and `42880060851` (`fix/precompact-keep-lock`, 19:49 and 18:55), `42880020509` and `42865953994` (`develop`, 18:55 and 17:32).

**Passing elsewhere**: 5 of 5 local runs of the test file alone; 16 parallel local runs with no failure; `npm run test:remote -- --run test:suite` on the LAN server (`Results: 31 passed, 0 failed` for this file).

**Timeline**: the failures on `develop` begin at 20:08, after PR #873 (`fix/precompact-keep-lock`) merged. The 21:24 pass on the task 294 branch shows the failure is not constant.

**Logs and Stack Traces**:

```
FAIL  concurrent: exactly one report block appended
      found 2 '## Pipeline Paused' headings
Results: 30 passed, 1 failed
```

**Related Files**:

- `shared/resources/develop-pipeline-on-precompact.test.sh` (the S12 section, assertion near line 435; it discards the hook's stderr with `2>/dev/null` at lines 418-419)
- `shared/resources/develop-pipeline-on-precompact.sh` (the `mkdir` claim, `take_claim`, the stale-claim steal, `ALREADY_PAUSED`, `mark_paused`)
- `.agents/skills/finalise/references/finalise-ci-poll.sh` and `ci-tree-equivalence.js` (the false green)

---

## Scope & Impact

**Reference**: CI health (every PR), the pre-compact hook's concurrency guarantee, and `/finalise` CI reading 2. No single story or task owns it: the test belongs to task 120's claim work, the red gate affects all pipelines, and the false green is a separate defect in the finalise poll.

**How It Failed**: Two runs both appending a block means both passed the claim, or the second started after the first released the claim and found the lock unmarked. The test's `git` shim sleeps 1 s on `commit`, which keeps the first run inside its flow when the second starts, so a second block needs either a claim that did not hold or a first run whose `mark_paused` failed (the hook then keeps the lock unmarked and a later run treats it as fresh). Not confirmed: the hook's stderr is discarded by the test, so the actual path is unknown.

**Second defect (file separately if confirmed)**: the finalise CI poll returned `SUCCESS ... TREE_EQ=291d7750a4db` for head `3e0e47c2` while GitHub showed `test` FAILURE on that head. A tree-equivalent earlier success must not override a failure on the head itself.

**Suggested first step**: have the S12 section keep the two runs' stderr (write to `$S12/err.a` and `$S12/err.b` and print them in the `fail` message), push on a branch, and read the output from a failing hosted run. Then fix the cause and mutation-prove the fix.

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

| Date       | Status | Changed By | Notes                                  |
| ---------- | ------ | ---------- | -------------------------------------- |
| 2026-11-11 | New    | Claude     | Bug created during task 294 finalise   |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
