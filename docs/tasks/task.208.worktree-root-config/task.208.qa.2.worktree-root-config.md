# QA Report: Task 208 - Worktrees live inside the repo under a configurable root (cycle 2)

**Task**: [Link to task document](./task.208.worktree-root-config.md)
**Gate File**: [task.208.gate.2.worktree-root-config.yml](./task.208.gate.2.worktree-root-config.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-14
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA-208-1 / TASK-208-BUG-1 — symlinked root escapes the repo | ✅ FIXED | `13b: worktreeRootEscapes follows symlinks out of the repo, and only out` and `13b: CLI --batch refuses a root that is a symlink out of the repo`; six mutations each red. Bug closed. |
| QA-208-2 — control characters accepted | ✅ FIXED | Probe `path.null-byte` now rejected; normaliser test covers NUL, newline, tab |

## Executive Summary

The cycle-1 fixes hold. The cycle-2 refute pass, over the whole change plus the fix, found two medium
defects in `develop-batch` Step 0.3a that the selector fix does not reach: the exclude line is written
before the root is validated, and git's exit 128 is read as "not ignored" (TASK-208-BUG-2). Also a
low-severity quadratic regex in the nested-worktree check.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL — fix TASK-208-BUG-2

## Review Methodology

Re-review scope: unscoped — cycle 2 is a full refute pass over the whole change (PR #657 merge diff
plus fix commit `850f5c8c`), per the QA rules. One read-only reviewer with the refute directive.
Reviewer time: 307 s (completion notice `duration_ms`).

## New Findings This Cycle

- **[medium]** `skills/develop-batch/SKILL.md:189` — Step 0.3a writes the raw root into `.git/info/exclude` before Step 1 validates it → validate first, write from the normalised root. Promoted: QA-208-3 ([TASK-208-BUG-2](./task.208.bug.2.exclude-written-before-root-validated.md)).
- **[medium]** `skills/develop-batch/SKILL.md:188` — `git check-ignore` exit 128 read as "not ignored" → branch on the exit status. Promoted: QA-208-4 (same bug).
- **[low]** `shared/resources/qa-execute-snippets.mjs:1615` — gitdir regex quadratic in whitespace (reviewer timed 40k spaces at 19 s) → parse the first line without a backtracking regex. Promoted: QA-208-5.
- **[medium, confidence medium — advisory]** `skills/develop-batch/SKILL.md:294` — resume creates a recorded `dir` without re-checking it.
- **[medium, confidence medium — advisory]** `skills/develop-next/scripts/select-next.mjs:105` — a tracked directory or `.git` is accepted as the root.
- **[low, advisory]** stale check uses only the current root (`SKILL.md:196`); `--batch` CLI tests depend on the host checkout's cwd (`select-next.mjs:1958`); a submodule named `…/worktrees/x` matches the linked-worktree test (`qa-execute-snippets.mjs:1616`).

## Security — CONCERNS

- **Evidence**: measured · **Probes executed**: 11 (`task.208.qa.2.security.run.json`)
- 2 hostile still accepted by the lexical normaliser, both by design: `path.encoded-traversal` (nothing
  decodes the root) and `path.symlink-escape` (the probe input has no real link; the CLI real-path
  check refuses real ones, held by committed tests).

## Test Commands Executed

```bash
npm test                     # 5487: 5469 pass, 4 fail (obs #39, worktree-only)
npm run eval:develop-next    # 201 pass
npm run eval:develop-batch   # 76 pass
npm run bundle:check         # 0 problems
npm run validate -- skills/develop-next/ ; npm run validate -- skills/develop-batch/   # exit 0
```

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` for QA-208-3, -4, -5.
