# Bug Report: Task 217 - The review-code --inline guard cannot be reached by the probe engine

**Task**: [Link](./task.217.finding-anchors-advisory-follow-ups.md)
**Bug ID**: TASK-217-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 1 boundary probe)
**Date Found**: 2026-10-23

## Description

The `/review-code --inline` guard is a boundary: its HALT keeps findings from being posted. `security-probe.mjs`'s `fence:` form runs the **first** bash block under the heading it names. The guard is the second block under "Step 4 — `--comment` (optional)", so the probe reads the GitHub-only block above it.

## Steps to Reproduce

```bash
command node shared/resources/security-probe.mjs --sink filename \
  --entry 'fence:skills/review-code/SKILL.md#Step 4 — `--comment` (optional)' \
  --slot '{findings-json}' \
  --cases-file docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.review-code-inline-cases.json --json
```

## Expected Behavior

The probe engine reaches the guard and runs the 19 prepared cases.

## Actual Behavior

`verdict: unverifiable`, `reason: bad-slot`, 0 executed. The control is recorded that way in `task.217.qa.1.security.run.json`.

## Impact

The guard is held only by unit tests. `/finalise`'s zero-guard would fail a record that has 0 executed.

## Recommendation

Give the `--inline` block its own heading so `fence:` resolves to it. Then re-run the command above with that heading and record the run.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root cause**: the probe engine's `fence:` form runs the first bash block under the named heading.
The `--inline` block was a numbered list item under "Step 4 — `--comment` (optional)", below the
platform-helper block, so no heading resolved to it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-24

**Fix description**: items 2 and 3 of Step 4 became sub-headings, "Step 4.2 — Post the findings
inline (both platforms)" and "Step 4.3 — Summary-only fallback". The `--inline` block is the only
fenced block under Step 4.2. The block text is unchanged apart from QA1-4 (it now exits with the
poster's status).

**Files modified**: `skills/review-code/SKILL.md`.

**Testing**: the prepared cases now run.

```bash
command node shared/resources/security-probe.mjs --sink filename \
  --entry 'fence:skills/review-code/SKILL.md#Step 4.2 — Post the findings inline (both platforms)' \
  --slot '{findings-json}' \
  --cases-file docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.review-code-inline-cases.json --json
```

The result was `engages`, `hostile-rejected-legitimate-accepted`, 19 executed and 19 passed. Recording
the run in the security record is QA cycle 2's step.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-23 | New | qa-task | Found by task.217.qa.1.finding-anchors-advisory-follow-ups.md |
| 2026-10-24 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-24 | Ready for QA | qa-fix | --inline block under its own heading; probe 19/19 engages |
| 2026-10-24 | Closed | qa-task | Verified by task.217.qa.2.finding-anchors-advisory-follow-ups.md |
