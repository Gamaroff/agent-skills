# Bug Report: Task 123 - set_qa_phase is defined in one fenced block and called bare from others

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, diff code review CR-2 — verified)
**Date Found**: 2026-09-19

## Description
`set_qa_phase` is defined only inside the Loop Setup fenced block of `develop-pipeline-step-5-6-qa-loop.md` and then invoked bare (`set_qa_phase 5a|5b|5c`) at 5a, 5b, 5c, the route-2c half-cycle and the resume contract's re-entry step. Each orchestrator Bash call is a fresh shell — the repo's own precedent (`high_files`, `_mtime`) defines and calls within one block — so the function is unreachable at every call site.

## Steps to Reproduce
See the QA report (`task.123.qa.1.qa-loop-exits-and-re-entry.md`, Code Review section, CR-2) — the reproduction is in the finding.

## Expected Behavior
Every call site can write `qa_phase` with one line that resolves from the repository root, like every other helper the loop uses (`advance-pipeline-lock.sh`, `qa-cycle.sh`).

## Actual Behavior
`qa_phase` is never written unless the agent re-pastes the function; the Stop hook's default arm then names `/qa-task` on a 5b or 5c stall — the loud default, but a wrong one on every stall after 5a.

## Impact
Phase 1's mechanism (the hook reading `qa_phase`) is correct and tested, but the writer half is prose that cannot execute as written, so in practice the hook sees an absent field.

## Recommendation
Ship the writer as a script — `shared/resources/set-qa-phase.sh 5a|5b|5c`, sibling of `advance-pipeline-lock.sh`, cited from the step doc so the bundler vendors it into develop-task and develop-story — invoke it at each call site as `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5b`, give it a test in the same shape as `advance-pipeline-lock.test.sh`, and update the parity test's `set_qa_phase` pins.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 1 (CR-2) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 1 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: A shell function defined in one fenced block does not exist in the next; every orchestrator Bash call is a fresh shell, so the documented writer could not run where it was called.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- New `shared/resources/set-qa-phase.sh` — sibling of `advance-pipeline-lock.sh`: validates `5a|5b|5c`, noops with no lock, fails closed on a non-object lock, `mktemp` + `mv` write, never touches `current_step`.
- New `shared/resources/set-qa-phase.test.sh` (19 assertions, incl. the two-separate-shells property and a zsh caller); added to `npm test`.
- The step doc cites `shared/resources/set-qa-phase.sh` (so it bundles into develop-task/develop-story) and every call site — 5a, 5b, 5c, the route-2c half-cycle — invokes `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5x`; the resume contract's re-entry step and both SKILL.md likewise.
- The parity test forbids a bare `set_qa_phase` anywhere and requires ≥ 4 script invocations covering 5a/5b/5c.

**Files Modified**:
- `shared/resources/set-qa-phase.sh` (new), `shared/resources/set-qa-phase.test.sh` (new), `package.json`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`

**Testing**:
- `set-qa-phase.test.sh` 19/19; shellcheck clean; parity 5/5.

**Verification Steps for QA**:
1. `grep -rn set_qa_phase shared skills --exclude-dir=references` → no hits.
2. From two separate shells run `PIPELINE_LOCK=/tmp/l.json bash shared/resources/set-qa-phase.sh 5b` then `… 5a` → the lock reads `5a`.
