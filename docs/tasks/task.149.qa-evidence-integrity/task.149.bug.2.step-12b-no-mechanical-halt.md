# Bug Report: Task 149 - Step 12b / item 3e compute the read-back result and never act on it

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1, code review CR-1, verified)
**Date Found**: 2026-09-26

## Description

The new qa-task Step 12b block (`skills/qa-task/SKILL.md`, the `doc-links.js … ; LINKS_RC=$?` line)
and qa-story item 3e assign `LINKS_RC` and `LOG_RC` and read neither. `doc-links.js` exits 1 for
`untracked` (which the prose says is expected) and for `missing` (which must stop the PR comment),
so the exit code alone cannot say which happened. The halt task.149 Phase 4 promises therefore rests
on the agent reading the JSON and acting on it: a self-reported verdict gating whether the work was
done, which is the shape obs #164 exists to remove.

## Expected Behavior

The block itself derives the decision: it exits non-zero when any `broken[]` entry has
`state: missing`, or when `change-log.js --check-updated` exits 1, and prints what it found; an
`untracked`-only result does not halt.

## Actual Behavior

The block always finishes with the status of its last command, and nothing in it halts.

## Evidence from its first real run (this QA cycle, Step 12b)

Run verbatim with `TASK_DIR=docs/tasks/task.149.qa-evidence-integrity`: `QA_CYCLE=1 LINKS_RC=1 LOG_RC=0`.
Both broken links were this cycle's own bug reports, labelled `untracked`: the block stages the
document, gate and report, but not the bug reports that Step 12's *Key Findings* link to. The run
was correct, and it exited 1, the same code a `missing` report would give. The decision had to
be made by reading the JSON, which is this defect.

## Impact

A QA run can post a PR comment linking a report that was never written — the task.141 cycle-4
failure this step was written to stop — whenever the agent misreads or skips the JSON.

## Recommendation

Parse the `--json` output in the block (for example
`node -e` over it, counting `state === "missing"`) and `exit 1` on a missing link or `LOG_RC=1`;
stage every artifact the run wrote (bug reports included), and extend `tests/qa-evidence-integrity.test.js` so the Step 12b / 3e sites must carry the halt.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: the block delegated the decision to its reader. `doc-links` exits 1 for every broken
link whatever its `state`, and the block staged only the document, gate and report — not the bug
reports the QA Results section links.

#### Fix Implementation (In Progress → Ready for QA)

- qa-task Step 12b and qa-story item 3e: stage bug reports too; derive `BLOCKING` from the `--json`
  output (every broken link whose state is not `untracked`, plus an unterminated fence); list each
  broken link with its state; `exit 1` with a named `HALT` on a missing/ignored link, on a
  `change-log --check-updated` failure, or when the JSON is unreadable (could not look); `:?` guard on
  the block's input (CR-4).
- `doc-links.js`: a third state, `ignored` (on disk, gitignored — can never be committed) (CR-2).
- `tests/qa-read-back-block.test.js` (new): lifts both blocks from their SKILL.md and runs them in a
  consumer-shaped repository under bash and zsh — clean → 0, missing → 1, ignored → 1, stale → 1, unset
  input named. 20/20. The first version of the halt had a jq precedence error
  (`… | length + (if .unterminatedFence …)` indexes an array) and failed closed on every input; this test
  found it and holds it (mutation: 8 red).
- `tests/qa-evidence-integrity.test.js`: both sites must carry ``ignored`` and their `HALT` line.

**Verification Steps for QA**: `node --test tests/qa-read-back-block.test.js`; run Step 12b for real
on this task after the cycle-2 gate is written.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-26 | In Progress | qa-fix | Investigation started |
| 2026-09-26 | Ready for QA | qa-fix | Fix implemented (qa-fix cycle 1) |
