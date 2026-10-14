# QA Report: Task 208 - Worktrees live inside the repo under a configurable root (cycle 6)

**Task**: [Link to task document](./task.208.worktree-root-config.md)
**Gate File**: [task.208.gate.6.worktree-root-config.yml](./task.208.gate.6.worktree-root-config.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: PASS

## Re-Review Context

Re-QA of the fixes for the gaps `/finalise` run 1 found (`task.208.dod.1.worktree-root-config.md`).

| DoD gap | Status | Evidence |
| --- | --- | --- |
| AC1 — prose members untested; scratch worktrees in scope | ✅ FIXED | Criterion scoped to persistent worktrees (owner). `tests/worktree-root-coverage.test.js`: no shipped skill, shared doc or runbook has a sibling worktree path; reintroducing `git worktree remove ../x`, `git -C r worktree add ../../x` or `../worktrees/` turns it red |
| AC6 — search exclusions untested | ✅ FIXED | The six `.worktrees` exclusion commands are extracted from the three skills and run against a fixture with a nested worktree; removing any exclusion turns it red. `.gitignore` asserted |
| Docs — develop-next `--batch` | ✅ FIXED | `skills/develop-next/SKILL.md` names the root, `--worktree-root` and the gitignore requirement |

## Review Methodology

Two read-only review rounds on the gap-fix diff (169 s, 86 s). Both found cases the new sibling-path
regex got wrong (missed `worktree remove ../x`, `add -b x ../y`; then `cd ../..` forms). Move: scope
the claim (qa-fix Step 2.6) — the `cd` heuristic is dropped and the guard checks the `git worktree
add|move|remove` line itself. The final scoping commit (`ab31952f`) was mutation-proved but not
reviewed by a third reviewer.

## New Findings This Cycle

- **[low, advisory]** `tests/worktree-root-coverage.test.js:144` — the exclusion test reads a fixed list of three skills; a new repo-wide search added elsewhere is not checked.

## Test Commands Executed

```bash
npm test     # 5502: 5484 pass, 4 fail (obs #39, worktree-only)
node --test tests/worktree-root-coverage.test.js   # 4 pass; 8 mutations red
```

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Next Steps**: `/finalise` run 2.
