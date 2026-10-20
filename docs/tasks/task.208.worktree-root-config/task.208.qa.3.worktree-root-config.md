# QA Report: Task 208 - Worktrees live inside the repo under a configurable root (cycle 3)

**Task**: [Link to task document](./task.208.worktree-root-config.md)
**Gate File**: [task.208.gate.3.worktree-root-config.yml](./task.208.gate.3.worktree-root-config.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: CONCERNS

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA-208-3 — exclude written before validation | ✅ FIXED | Step 0.3a block executed by `Step 0.3a: a refused root halts before anything is written`; mutation red |
| QA-208-4 — exit 128 read as not ignored | ✅ FIXED | `Step 0.3a: git unable to answer halts, never reads as not-ignored`; mutation red |
| QA-208-5 — quadratic gitdir regex | ✅ FIXED | `isLinkedWorktree reads a whitespace-heavy .git file in linear time`; old regex times out |

TASK-208-BUG-2 closed.

## Review Methodology

Re-review scope: files changed since gate 2 (head 1746fa09e61e; 6 files) — default. One read-only
reviewer. Reviewer time: 89 s.

## New Findings This Cycle

- **[medium]** `skills/develop-batch/SKILL.md:204` — "Use the printed `$ROOT` … everywhere below": `$ROOT` exists only inside the block; later steps use `<worktreeRoot>` → state that the printed value is the `<worktreeRoot>` substituted below. Promoted: QA-208-6 ([TASK-208-BUG-3](./task.208.bug.3.root-variable-used-outside-its-block.md)).
- **[low, advisory]** `skills/develop-batch/SKILL.md:192` — a configured root with `$`, quotes or backticks is expanded by the placeholder substitution before `--check-root` sees it.
- **[low, cleanup]** `shared/resources/tests/qa-execute-snippets.test.mjs:2538` — comment claims a ratio check the test does not make.

## Test Commands Executed

```bash
npm test                     # 5494: 5476 pass, 4 fail (obs #39, worktree-only)
npm run eval:develop-next    # 202 pass
npm run eval:develop-batch   # 79 pass
npm run bundle:check         # 0 problems; validate: 9 skills exit 0
```

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` for QA-208-6.
