# Bug Report: Task 120 - The identity's non-match fallback returns the command verbatim, so a bare `scripts/<hook>.sh` collides with ours

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 4 — completeness of the cycle-3 fix for bug.4)
**Date Found**: 2026-09-16

## Description

The cycle-3 fix made `hook_identity` an anchored match that returns the **command verbatim** when it does not match, on the reasoning that a verbatim command can never equal `scripts/<hook>.sh`. It can: a consumer hook whose command is literally `scripts/on-stop.sh` (an executable invoked with no interpreter, at the project root) is returned verbatim as `scripts/on-stop.sh` — byte-identical to our identity — and `heal_hook` deletes it. Reproduced: `hook_identity "scripts/on-stop.sh"` → `scripts/on-stop.sh`. Scenario 9 covers only the `bash`-prefixed and `${CLAUDE_PROJECT_DIR}/` spellings. The wizard mirror has the same fallback.

## Expected Behavior

The value the identity produces for **our** hook must live in a namespace no consumer command can occupy — so equality with it is only ever reachable by matching the anchored pattern.

## Actual Behavior

The match result and the fallback share the same string space.

## Impact

Deletes a consumer's interpreter-less project-root hook on re-run. Narrow but a direct violation of the "never touched" promise, and the same class as bug.4.

## Recommendation

Prefix the **match** result with a token no command can begin with — e.g. `develop-pipeline-hook:scripts/<hook>.sh` — and keep the fallback verbatim; `patch_hook` and `heal_hook` compare identities exactly as now. Add the interpreter-less `scripts/on-stop.sh` spelling to Scenario 9. Mirror in the wizard.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 4)

**Root Cause**: the match result and the non-match fallback shared one string space, so a consumer command that *is* the identity string collided.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `hook_identity` / `_hook_identity`: a match is returned as `develop-pipeline-hook:scripts/<hook>.sh`; a non-match is still returned verbatim. A hook command never begins with a colon-prefixed token, so equality with the match result is reachable only through the anchored pattern.

**Files Modified**:
- `shared/resources/develop-pipeline-install-hooks.sh`, `scripts/setup-consumer.sh`
- `shared/resources/develop-pipeline-install-hooks.test.sh` — Scenario 9 gains the interpreter-less `scripts/on-stop.sh`

**Testing**: 11/11; mutation-proven — prefix removed → Scenario 9 red (`the interpreter-less scripts/on-stop.sh survives (bug.6)`) → **covered**.

**Verification Steps for QA**: `hook_identity "scripts/on-stop.sh"` → `scripts/on-stop.sh`; `hook_identity "bash .agents/skills/develop-story/scripts/on-stop.sh"` → `develop-pipeline-hook:scripts/on-stop.sh`; the reproduction fixture keeps the consumer hook.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 4 |
| 2026-09-16 | In Progress | qa-fix | Investigation — shared string space |
| 2026-09-16 | Ready for QA | qa-fix | Namespace-prefixed match result; scenario 9 |
