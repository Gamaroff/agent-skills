---
type: bug
id: task.189.bug.4
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-16
---

# Bug Report: Task 189 - Probe severities are merged by corpus case id alone

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 2, finding CR2-1)
**Date Found**: 2026-10-16

## Description

Step 3b.1 item 3 (`skills/finalise/SKILL.md:557`) re-dispatches the security agent for "a `severity` per probe `id`" and merges each returned severity onto its probe. A probe's `id` is the corpus case id, which every control on the same sink shares: two accept-everything controls on `url-authority` produce 18 probes with only 9 distinct ids (measured with `security-probe-plan.mjs` on two copies of `absent-control.mjs`).

## Expected Behavior

Each probe is graded and merged by a key unique within the run, so a `low` grade reaches only the probe it was given for.

## Actual Behavior

A grade for one control's case can land on another control's case with the same id.

## Impact

A `low` grade can open Step 8a's fix-and-recheck path for a finding that was never graded low.

## Recommendation

Give each runner probe a unique `key` (`<plan index>:<id>`), grade and merge by that key, and pin it with a test that has two controls reproducing the same id.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-16
**Developer**: qa-fix (develop-task Step 5b, cycle 2)

**Root Cause**: The runner's probe carried only the engine's case `id`, and Step 3b.1 told the grader to return a severity per `id`. Ids come from the shared corpus (or a cases file), so they repeat across controls on one sink.

#### Fix Implementation

**Fix Description**: Each runner probe now carries `key: "<plan index>:<id>"`, unique within the run; Step 3b.1 item 3 grades and merges by `key` and says why `id` is not enough. Also in this cycle (advisory findings from gate 2): the corrected-plan re-run must carry the whole plan (CR2-2); a null record after a run is `record-unreadable` (CR2-3); the runner owns `--timeout` and bounds each engine run, killing one that outlives it as a refusal (CR2-4); the prompt no longer claims `totals.executed` equals the per-entry sum (CR2-5).

**Files Modified**: `shared/resources/security-probe-plan.mjs`, `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Testing**: `read-only-agent-writes.test.mjs` (14/14) — new: two controls sharing ids yield unique keys; null record → record-unreadable; an engine run past the bound is a refusal; `--timeout` refused. Contract test pins `per probe \`key\`` and the whole-plan rule. Five mutation proofs (D1–D5), each red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Found by task.189.qa.2.read-only-agents-never-write.md |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA cycle 2 |
