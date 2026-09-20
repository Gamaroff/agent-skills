# Bug Report: Task 130 - a snapshot with no `pr_url` makes `gh pr view ""` read the CURRENT branch's PR

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 4 scoped review CR-3, reproduced by QA)
**Date Found**: 2026-09-20

## Description

When the snapshot carries no `pr_url` (a halt before Step 4), `SNAP_PR` is empty and `gh pr view "" --json state` resolves the **current branch's** PR instead of failing — so the "evidence re-read from the file itself" is read from the checkout. A MERGED current-branch PR would delete a snapshot whose own file holds no merge evidence; the kept-case message prints `its PR ()`.

## Steps to Reproduce

`gh pr view "" --json number,state` in this repository → `{"number":441,"state":"OPEN"}` — the current branch's PR, not an error. Reproduced by QA on 2026-09-20.

## Expected Behavior

An empty `pr_url` is "no merge evidence": the snapshot is KEPT with that reason, before any `gh` call.

## Actual Behavior

The PR state of the current branch stands in for the snapshot's.

## Impact

Medium. The evidence re-read added for bug 8 can be satisfied by the wrong PR on exactly the snapshots (pre-Step-4 halts) that have the least evidence.

## Recommendation

`[ -n "$SNAP_PR" ] || { echo "stale snapshot $p KEPT — it names no pr_url, so there is no merge evidence to re-read"; continue; }` before the `gh` call; test N variant: no `pr_url` + MERGED stub → kept.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 4)

**Root Cause Analysis**: pass 2 passed `$SNAP_PR` to `gh pr view` unconditionally; `gh pr view ""` resolves the current branch's PR, so a pre-Step-4 snapshot with no `pr_url` was checked against the wrong PR.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: An empty `pr_url` is "no merge evidence": the loop prints `stale snapshot <p> KEPT — it names no pr_url, so there is no merge evidence to re-read` and `continue`s before any `gh` call. Rule 5 in the block header now reads "a failed, non-MERGED or ABSENT pr_url KEEPS the snapshot".

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — delete block re-binds from `{doc-directory}/.summaries/step-0a-resume-detector.json` (rule 6: the file is the carrier); empty `pr_url` → KEPT before any `gh` call; prose names the fresh-shell rule
- `shared/resources/pipeline-resume-detector-prompt.md` — § Output Schema field table is the one statement of the note-object shape; sites :108, :112, :113, :167 and the mtime delta rewritten as objects; CR-5 mtime fields conditional
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — file-only carrier (no variable injection); E asserts the HALT on an absent file; P runs bind and delete in two separate processes; N2 no-`pr_url` + MERGED stub → KEPT; Q enumerates the prompt's `deltas_since_pause` sites (same-line object or continuation of an object opened above — a ±1 window let neighbours vouch for each other); 36/36 under bash and `zsh -f`
- `shared/resources/advance-pipeline-lock.test.sh` — CR-4: provenance scenario comment corrected, consume asserted (85/85)
- bundled `skills/*/references/` regenerated

**Testing**: N2 (snapshot without `pr_url`, stub `gh` answering MERGED for anything → KEPT, file present, exit 0) under bash and `zsh -f`. Mutation: the empty-`pr_url` guard removed → N2 red ×2.

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 4 (cycle 4 scoped review CR-3, reproduced by QA) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
