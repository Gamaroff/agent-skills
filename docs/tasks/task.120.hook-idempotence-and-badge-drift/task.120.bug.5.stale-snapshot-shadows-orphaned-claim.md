# Bug Report: Task 120 - A stale `last-halt.json` shadows a fresher orphaned claim in the resume detector's fallback order

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 3 — completeness of the cycle-2 fix for bug.2)
**Date Found**: 2026-09-16

## Description

The cycle-2 fix made the Phase 0a resume detector read `develop-pipeline.lock.pausing.*` as a **third** fallback, reached only when both the lock and `last-halt.json` are absent. Nothing in the pipeline consumes `last-halt.json` on a successful resume — `SKILL.md` deletes it only on "Start fresh" — so a snapshot from any earlier pause or halt persists indefinitely. This repository has one right now: `.claude/state/develop-pipeline.last-halt.json` is task.110's compaction pause (`halt_step: 5`, `2026-09-15`). A PreCompact hook killed in the claim window today would leave an orphaned claim for task.120 that the detector never reaches, because the stale task.110 snapshot satisfies level two first — and it would recommend resuming task.110 at step 5.

## Steps to Reproduce

1. Leave a `last-halt.json` from an earlier run in `.claude/state/` (as this repo has).
2. Create an orphaned `develop-pipeline.lock.pausing.<pid>` for the current task with no lock.
3. Follow the detector's Step 1: level two is taken; the claim is never read.

## Expected Behavior

With no lock, the detector chooses between `last-halt.json` and the newest `.pausing.*` by which is **about the document being resumed** (`task_or_story_directory`) and, among those, which is **newer** — not by a fixed order that assumes snapshots are consumed.

## Actual Behavior

Fixed three-level precedence; a stale snapshot always wins.

## Impact

The fallback added for bug.2 is unreachable in exactly the environment most likely to have a killed pause (one with prior pauses). Wrong-task resume recommendation is the worse failure.

## Recommendation

In the detector prompt: when the lock is absent, gather both candidates, drop any whose `task_or_story_directory` does not match `DOC_DIR` (report the mismatch in `deltas_since_pause` — a stale snapshot for another task is itself worth surfacing), and take the newest by mtime; set `source` to whichever won. State the rule once in Step 1 in place of the numbered fallback. Optionally, have the orchestrator remove `last-halt.json` when it re-creates the lock on a successful resume — that is a separate orchestrator change and may be deferred.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 3)

**Root Cause**: Step 1 of the detector prompt was a fixed three-level fallback (lock → snapshot → claim) written as if a snapshot were consumed on resume. It is not, so level two is almost always satisfied by something stale.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `shared/resources/pipeline-resume-detector-prompt.md` Step 1: when the lock is absent, list `last-halt.json` and every `.pausing.*` together (`ls -t`), **drop** any candidate whose `task_or_story_directory` is not the document's directory (reporting each drop in `deltas_since_pause`), take the **newest by mtime**, and set `source` from the winner. The "none" branch now reads "no candidate *for this document*" and still surfaces dropped candidates.
- Hook sweep comment, `develop-pipeline-pause.md` item 1, the hook test's scenario-15 comment and the CHANGELOG all reworded from "last fallback" to the choose-by-document-then-age rule. Bundled into 9 skills.
- The orchestrator-side option (consume `last-halt.json` on successful resume) is recorded in gate 3's `recommendations.future`; not taken here.

**Files Modified**:
- `shared/resources/pipeline-resume-detector-prompt.md` (+ 9 bundled copies)
- `shared/resources/develop-pipeline-pause.md`, `shared/resources/develop-pipeline-on-precompact.sh` (comment), `shared/resources/develop-pipeline-on-precompact.test.sh` (comment), `CHANGELOG.md`

**Testing**: prose change; no runnable-snippet regression (`qa-execute-snippets` runs the `ls -t` block clean). The rule is stated once and the enum documents `orphaned_claim`.

**Verification Steps for QA**: with this repo's stale task.110 snapshot and a synthetic `.pausing.*` for task.120, walk Step 1 — the snapshot is dropped (other directory, reported), the claim wins.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 3 |
| 2026-09-16 | In Progress | qa-fix | Investigation — fixed precedence assumed consumption |
| 2026-09-16 | Ready for QA | qa-fix | Choose by document, then age; docs aligned |
| 2026-09-16 | Closed | QA Engineer | Verified in QA cycle 4: Step 1 walked against the real stale task.110 snapshot + synthetic task.120 claim — snapshot dropped, claim wins |
