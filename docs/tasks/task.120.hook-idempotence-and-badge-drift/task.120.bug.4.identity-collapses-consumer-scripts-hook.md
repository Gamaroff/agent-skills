# Bug Report: Task 120 - Cross-skill identity collapses a consumer's own `scripts/<hook>.sh` onto ours and deletes it

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 3 — regression from the cycle-2 fix for CR-3)
**Date Found**: 2026-09-16

## Description

Cycle 2 widened `hook_identity` to strip the `develop-(story|task|bug)/` segment so the three byte-identical hook scripts share one identity. Each prefix is stripped independently, so a command with **no** skill segment at all — a consumer's own project-root hook such as `bash scripts/on-stop.sh` or `bash "${CLAUDE_PROJECT_DIR}/scripts/on-stop.sh"` — reduces to `scripts/on-stop.sh`, which is now exactly our identity. `heal_hook` therefore removes it as a "duplicate spelling". Reproduced: a `Stop` group holding only `bash scripts/on-stop.sh` → after the installer, the consumer's hook is gone and ours stands in its place. Before the widening the two identities were `develop-story/scripts/on-stop.sh` vs `scripts/on-stop.sh` — distinct. The installer header's promise ("a consumer's unrelated hook is never touched") is broken by the very change that made the "one entry per event" claim true; the wizard's `_hook_identity` mirrors it.

## Steps to Reproduce

1. `settings.json` with `Stop: [{matcher:"*", hooks:[{command:"bash scripts/on-stop.sh"}]}]` and the develop-story scripts present.
2. Run the installer.
3. Output: `- Stop: removing duplicate spelling (bash scripts/on-stop.sh)`; the file holds only our entry.

## Expected Behavior

Only a command that actually names one of the three develop-* skills (under either root, quoted or bare) shares our identity. Anything else keeps an identity that can never equal ours.

## Actual Behavior

The skill segment is optional in the strip, so its absence is indistinguishable from its presence.

## Impact

Silent deletion of a consumer's own hook whenever it lives at `scripts/<same-name>.sh` relative to the project root. Introduced in `65bd420d`.

## Recommendation

Make the identity a single anchored match rather than independent strips: `^(bash +)?("?\${CLAUDE_PROJECT_DIR}/)?(\.(claude|agents)/skills/)?develop-(story|task|bug)/(scripts/[^"[:space:]]+)"?$` → identity is the captured `scripts/<hook>.sh`; a command that does not match returns itself unchanged (and so can never equal ours). Mirror in `_hook_identity`. Fixture: a project-root `bash scripts/on-stop.sh` and a `"${CLAUDE_PROJECT_DIR}/scripts/on-precompact.sh"` must survive the heal; the cycle-2 cross-skill scenario must still converge.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 3)

**Root Cause**: `hook_identity` applied four independent `s###` strips; each was optional, so a command carrying none of the prefixes reduced to the same tail as ours. The cycle-2 widening added the fourth strip and made a consumer's project-root `scripts/<hook>.sh` indistinguishable from ours.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `hook_identity` (installer) and `_hook_identity` (wizard) are one anchored `sed -nE … p` match: `^(bash +)?("?${CLAUDE_PROJECT_DIR}/)?(\.(claude|agents)/skills/)?develop-(story|task|bug)/(scripts/[^"[:space:]]+)"?$` → group 6. A command that does not match is returned **verbatim**, so it can never equal `scripts/<hook>.sh`.

**Files Modified**:
- `shared/resources/develop-pipeline-install-hooks.sh`, `scripts/setup-consumer.sh`
- `shared/resources/develop-pipeline-install-hooks.test.sh` — Scenario 9
- `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` — static assertion re-pointed at the anchored form and asserts the segment is required

**Testing**:
- Scenario 9: `bash scripts/on-stop.sh`, `"${CLAUDE_PROJECT_DIR}/scripts/on-stop.sh"` and `"${CLAUDE_PROJECT_DIR}/scripts/on-precompact.sh"` all survive; our bare-relative spelling still heals; exactly one removal. Scenario 8 (cross-skill) still converges. 11/11.
- Probes: 9 inputs incl. `develop-storyx/`, `other/`, empty, bare `bash` — none collapse.
- mutation-proven: segment made optional again → scenario 9 red → **covered**

**Verification Steps for QA**: re-run the reproduction from the Description — `bash scripts/on-stop.sh` survives.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 3 (regression from cycle-2 CR-3 fix) |
| 2026-09-16 | In Progress | qa-fix | Investigation — optional strips |
| 2026-09-16 | Ready for QA | qa-fix | Anchored match requiring the develop-* segment; scenario 9 |
| 2026-09-16 | Closed | QA Engineer | Verified in QA cycle 4: `bash scripts/on-stop.sh` survives; segment-optional mutation red. Residual interpreter-less collision filed as bug.6 |
