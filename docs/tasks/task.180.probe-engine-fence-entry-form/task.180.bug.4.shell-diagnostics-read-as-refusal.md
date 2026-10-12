# Bug Report: Task 180 - shell diagnostics other than a parse error still read as a refusal

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, code review CR-2 / TASK-180-005)
**Date Found**: 2026-10-12

## Description

Cycle 1 made a parse failure `errored`, but an input that makes the shell stop with another diagnostic about the generated script — `${x:?boom}`, parameter not set, command not found — is still scored `rejected`; an accept-all block with such a hostile case scores `engages`. An input that injects its own `exit` produces no diagnostic and cannot be told from a refusal by exit status.

## Expected Behavior

Any shell diagnostic about the generated script is `errored`; the injection residual is stated where the rule is, and hostile cases are pointed at `expected`.

## Recommendation

Widen the classifier from parse errors to every shell diagnostic naming the script; document the residual.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 2

**Root cause**: The classifier matched syntax errors only.

**Fix**: `shellDiagnostic` takes the first stderr line in which the shell reports an error in the generated script (`<script>: line N: …` / `<script>:N: …`) on a non-zero exit, and `scoreFenceRun` scores it errored. The injected-exit residual is stated in probe-boundary-rule.md §5, and `expected` is shown to resolve it.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the rule restated in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story `SKILL.md`, `CHANGELOG.md`.

**Testing**: Regression test: `${x:?boom}`, `${x?}` errored; injected exit rejected by status, reproduced when the case carries the guard's refusal in `expected`. Mutation G2 → red.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-12 | New          | qa-task    | QA cycle 2 |
| 2026-10-12 | Ready for QA | qa-fix     | Fixed in the scoreFenceRun rewrite, mutation-proven |
