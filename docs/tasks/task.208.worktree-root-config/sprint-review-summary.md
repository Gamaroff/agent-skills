# Sprint Review Summary - Worktrees live inside the repo under a configurable root

**Task:** [task.208](task.208.worktree-root-config.md) · **Status:** Accepted (2026-10-14) · **PR:** #660 (implementation #657)

## Summary

Worktrees live inside the repo under a configurable root. Built by hand and merged as #657; the PR review, QA (6 cycles) and acceptance ran afterwards on #660, and the fixes they found are in that PR.

## What Was Delivered

### Acceptance Criteria Met

AC1–AC7 all pass. AC1 (persistent worktrees, owner-scoped) and AC6 are held by `tests/worktree-root-coverage.test.js`; AC3 by the select-next 13b tests including real symlinks; AC5 by Step 0.3a executed in `skill-shape.test.mjs`; AC7 by CI.

### Key Features Implemented

- `developBatch.worktreeRoot` (default `.worktrees`) and `select-next --worktree-root` / `--check-root`: worktrees inside the repo; absolute, `..`, control-character and symlinked-out roots refused
- develop-batch Step 0.3a validates the root first, then ignores it locally if needed (git exit status read three ways); stale check matches `<root>/batch-*`
- create-parallel-stories, both runbooks and develop-next `--batch` docs use `.worktrees/`
- Nested worktrees skipped by `qa-execute-snippets --copy` and by repo-wide grep/find in three skills; `/.worktrees/` in `.gitignore`

## Technical Details

### Files Modified/Created

See the task's Files Summary and the QA reports in this folder.

### Architecture/Design Decisions

See the task's Technical Background; QA-driven decisions are recorded in the bug reports beside the task.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

Per-PR tests hold every success criterion; every guard is mutation-proved (QA reports). `npm test`: 5502, 5484 pass, 4 worktree-only failures (obs #39) that pass in the main checkout.

### Code Review

`task.208.pr-review.1.worktree-root-config.md` and the QA refute passes.

## Security & Compliance

### Security Review

PASS — 21 probes (`task.208.dod.1.security.run.json`), 4 low and not exploitable; selector code unchanged since run 1 (section carried from dod.1).

### Compliance Review

Not applicable.

## Documentation

### Updated Documentation

PASS — CHANGELOG Changed + Fixed; develop-batch, create-parallel-stories, develop-next `--batch`, both runbooks, `.gitignore` and the configuration reference.

### Documentation Links

- [Task document](task.208.worktree-root-config.md)
- [DoD verification](task.208.dod.2.worktree-root-config.md)

## Demo Notes

### How to Verify

See the task's Testing Strategy; the QA reports list the exact commands.
