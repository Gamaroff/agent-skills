# Bug Report: Task 41 — the scaffolder's probe branch has no test coverage

**Task**: [task.41.pipeline-moments-and-scaffolding.md](./task.41.pipeline-moments-and-scaffolding.md)
**Bug ID**: TASK-41-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-08-12

## Description

`write_tracker_workflow()` has two branches — the **live-probe** branch and the **heredoc template** branch. All five new tests in `shared/resources/tests/setup-consumer-config.test.mjs` run in a `mkdtemp` scratch directory that contains no `.agents/skills/` tree, so the guard

```bash
if [[ "$DRY_RUN" != true && -n "$_cli" && -f "$_cli" ]] && node "$_cli" --init-workflow ...
```

is false on `-f "$_cli"` every time and **every test takes the heredoc path**.

The probe branch — which contains BUG-1 and BUG-2 — has zero coverage. That is why the suite is green at 1099/1099 while both defects are live.

## Steps to Reproduce

```bash
grep -n "_cli\|init-workflow" shared/resources/tests/setup-consumer-config.test.mjs
# → no matches: no test references the probe branch at all
```

## Expected Behavior

The branch that decides whether a consumer ends up with a file is exercised, including its failure modes.

## Actual Behavior

Only the fallback is tested. The tests assert the template is written, never that the wizard behaves correctly when a CLI *is* present and returns a skip.

## Impact

Two defects (one HIGH) shipped green. More importantly the coverage shape is misleading: "scaffolds when absent" passes, so the criterion reads as proven when only half its implementation was executed.

This is the same shape as the gap task.41 itself fixes in `develop-bug` — a code path nobody exercised, discovered only by reading it.

## Recommendation

Add tests that place a **stub CLI** on disk at the path `write_tracker_workflow` resolves, so the probe branch is taken:

1. Stub exits 0 **and writes no file** (BUG-1) → the wizard must still produce a `tracker-workflow.yaml` and must **not** report `generated from board`.
2. Stub exits 0 and writes a file → reported as board-derived, heredoc not used.
3. Stub exits non-zero → falls through to the template, file exists.

A stub is the right tool: it pins the wizard's contract with the CLI (what it does with each outcome) without needing credentials or a live board, and it fails loudly if someone later re-introduces exit-code inference.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

**Root Cause**: Every existing test ran in a `mkdtemp` dir with no
`.agents/skills/` tree, so `-f "$_cli"` was false and the probe branch was never
entered. The suite proved the fallback and nothing else.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

**Fix Description**: Added `runWithStubCli()`, which installs an executable stub
at the exact path `write_tracker_workflow` resolves, and four tests pinning the
wizard's contract with the CLI across every outcome it can produce:

1. exits 0 writing nothing → file still written, no board-provenance claim (the
   BUG-1 regression test)
2. exits 0 writing a record-derived file → kept, reported as board-derived
3. exits 0 writing a generic file → kept, reported as a template, warning shown
4. exits non-zero → falls through to the template

Plus a trailing-newline assertion for the LOW finding.

A stub is deliberately used rather than the real CLI: it needs no credentials and
no board, and it fails loudly if anyone re-introduces exit-code inference.

**Files Modified**:
- `shared/resources/tests/setup-consumer-config.test.mjs` — +5 tests (21 → 26)

**Testing**: 26/26 pass in this file; 1104/1104 across the suite.

**Verification Steps for QA**:
1. `grep -n "runWithStubCli" shared/resources/tests/setup-consumer-config.test.mjs`
2. Confirm test 1 fails if the exit-code inference is restored.

---

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-08-12 | New | QA Engineer | Found during QA cycle 1 |
| 2026-08-12 | In Progress | qa-fix | Investigation started |
| 2026-08-12 | Ready for QA | qa-fix | Fix implemented and verified |
| 2026-08-12 | Closed | QA Engineer | Fix verified in QA cycle 2 — see task.41.qa.2 |

---

## QA Verification (Ready for QA → Closed)

**Date**: 2026-08-12
**Verified by**: QA Engineer (cycle 2)
**Verification Result**: ✅ Fixed

See [task.41.qa.2.pipeline-moments-and-scaffolding.md](./task.41.qa.2.pipeline-moments-and-scaffolding.md) for the verification detail. Gate 2 is PASS at 96/100.
