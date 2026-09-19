# Bug Report: Task 123 - The grant block reads $QA_CYCLE bound in a different fenced block, and leaves a temp file on failure

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 — refute pass, CR-2 — verified)
**Date Found**: 2026-09-19

## Description
Both SKILL.md Phase 0b grant blocks and the resume contract's step-3 block read `"$QA_CYCLE"`, bound by the reconstruction snippet in a *different* fenced block — the cross-fence defect cycle 1's CR-2 was raised for, reintroduced by cycle 1's own fix. In a fresh shell it expands to the empty string, `jq --argjson c ""` exits 2 ("invalid JSON text passed to --argjson"), the lock is untouched, and the `&&` chain has no `rm -f "$TMP"` arm, so an empty `.claude/state/.grant.XXXXXX` is left behind.

## Steps to Reproduce
See the QA report (`task.123.qa.2.qa-loop-exits-and-re-entry.md`, Code Review section, CR-2) — the reproduction is in the finding.

## Expected Behavior
The grant derives every input it needs inside the one invocation that writes it, and cleans up on any failure.

## Actual Behavior
An empty `--argjson` value; no grant; a stray temp file.

## Impact
Same class as CR-2 (cycle 1); the fix must not be a third fenced block.

## Recommendation
Same script as bug 5 (`grant-qa-cycles.sh` reads the highest gate itself and removes its temp file on every failure path); every call site becomes one line.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 2 (CR-2) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 2 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: Cycle 1's fix inlined a jq that read a variable bound in a neighbouring fenced block — the CR-2 class it was fixing.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- Same script as bug 5: it derives the highest gate itself and removes its temp file on every failure; every call site is one line and carries no `$QA_CYCLE` and no inline `jq`.
- The parity test forbids `--argjson c "$QA_CYCLE"` and `.qa_max_cycles = (` at every call site.

**Files Modified**:
- as bug 5

**Testing**:
- parity 5/5; `grep -rn '--argjson c "$QA_CYCLE"' shared skills` → 0.

**Verification Steps for QA**:
1. `grep -rn 'grant-qa-cycles.sh' shared/resources/develop-pipeline-resume-contract.md skills/develop-*/SKILL.md` → one call each.
| 2026-09-19 | Closed | QA | Verified in QA cycle 3: fix present on `18b5328f`, re-executed (grant restore, stale-count guard, escalation row, CHANGELOG) |
