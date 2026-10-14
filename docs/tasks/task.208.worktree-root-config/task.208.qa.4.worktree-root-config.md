# QA Report: Task 208 - Worktrees live inside the repo under a configurable root (cycle 4)

**Task**: [Link to task document](./task.208.worktree-root-config.md)
**Gate File**: [task.208.gate.4.worktree-root-config.yml](./task.208.gate.4.worktree-root-config.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: CONCERNS

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA-208-6 — `$ROOT` used outside its block | ⚠️ PARTIAL | The sentence no longer names `$ROOT`, but it now points at "the value this block printed", and the block prints nothing on success. TASK-208-BUG-3 reopened. |

## Review Methodology

Re-review scope: files changed since gate 3 (head 8d6627f3866f; 2 files) — default. One read-only
reviewer for both tasks. Reviewer time: 92 s.

## New Findings This Cycle

- **[medium]** `skills/develop-batch/SKILL.md:204` — the block captures the root into `$ROOT` and prints nothing, so "the value this block printed" does not exist → print a labelled line and test it. Promoted: QA-208-7 ([TASK-208-BUG-3](./task.208.bug.3.root-variable-used-outside-its-block.md), reopened).

## Test Commands Executed

```bash
npm test                     # 5495: 5477 pass, 4 fail (obs #39, worktree-only)
npm run eval:develop-batch   # pass; bundle:check 0 problems; validate develop-batch exit 0
```

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` for QA-208-7.
