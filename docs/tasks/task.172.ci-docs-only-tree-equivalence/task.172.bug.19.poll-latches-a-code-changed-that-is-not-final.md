# Bug Report: Task 172 - The 6c poll latches code-changed, which the engine also returns after walking past a not-yet-green ancestor

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-19
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 4 scoped review; reproduced by QA)
**Date Found**: 2026-10-01

## Description

The engine returns code-changed after walking past a nearer ancestor that was PENDING, NONE, CANCELLED or (since cycle 3) green but not yet settled. Reproduced: B (code, green 1 h ago), C (code, green 60 s ago), H (docs) gives code-changed, exit 1; the same repository with C 400 s old gives tree-equivalent, exit 0. The poll latches code-changed as final, so the settle window turns a five-minute delay into a permanent loss of the rule for that poll.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; a configuration the engine cannot read is refused, not replaced by the defaults; an answer that can still change is never latched as final.

## Actual Behavior

See the description.

## Impact

The rule is lost for a poll, or an owner's opt-out is ignored.

## Recommendation

The engine reports code-changed only when no nearer ancestor was walked past undecided (so it is final for a pinned head); otherwise it reports no-green-ancestor naming the undecided ancestor and the code path, which the poll re-asks.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 4)

Reproduced by QA before the fix, and the reading in the source confirmed it.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: `classifyTreeEquivalence` remembers the nearest ancestor it walked past undecided (PENDING, NONE, CANCELLED, or green but not yet settled). A code path found beyond it is reported as `no-green-ancestor`, naming that ancestor and the path, instead of `code-changed`; `code-changed` is reported only when none was walked past, so it is final for a pinned head and the 6c poll's latch is correct. The latch comment in `skills/finalise/SKILL.md`, `configuration.md`, the engine header and the CHANGELOG say so.

Tests: a table over PENDING, NONE and CANCELLED (and the no-undecided control); a real-git CLI case B (code, green), C (code, 60 s old) and H (docs) giving `no-green-ancestor` and, with C 400 s old, `tree-equivalent`; and the real 6c poll re-asking twice rather than once. One older test put code beneath a docs commit with no CI of its own and expected `code-changed`; its fixture now puts the code in the head commit. Mutation proof: replacing the `undecided` branch with `false` turns three tests red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 4                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |
