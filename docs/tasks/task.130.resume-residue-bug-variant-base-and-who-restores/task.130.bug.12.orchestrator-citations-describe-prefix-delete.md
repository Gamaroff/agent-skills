# Bug Report: Task 130 - the three orchestrator citations describe the stale-snapshot delete as a PREFIX rule the contract's selector no longer has

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 5 safety re-probe CR-1, confirmed by QA)
**Date Found**: 2026-09-20

## Description

The Step 0a sentence that the feat commit added to all three orchestrators — `skills/develop-task/SKILL.md:72`, `skills/develop-story/SKILL.md:76`, `skills/develop-bug/SKILL.md:73` — reads:

> Stale snapshots the detector reports (a `deltas_since_pause` object whose `concern` **starts** `stale-snapshot`) are deleted **here**, by the orchestrator, and verified absent before Phase 0b — the loop is the resume contract § Consume Output; do not copy it (task.130).

Cycle 2 (bug 3) replaced the contract's `startswith("stale-snapshot")` selector with exact equality on `stale-snapshot: PR merged`, precisely because the detector's two skip notes (`stale-snapshot check skipped — …`) share the prefix and must never be acted on. The three citing sentences were not updated. They now promise a delete-and-verify for the skip notes that the executed block correctly refuses — and test D's citation regex (`/Stale snapshots the detector reports[^\n]*resume contract § Consume Output/`) passes on the prefix wording, so nothing holds the three descriptions to the selector.

## Steps to Reproduce

```bash
grep -rn -F 'starts `stale-snapshot`' skills/develop-task/SKILL.md skills/develop-story/SKILL.md skills/develop-bug/SKILL.md   # 3 hits
grep -n '== "stale-snapshot: PR merged"' shared/resources/develop-pipeline-resume-contract.md                                    # the selector: equality
```

## Expected Behavior

Every citing site either names the exact label the selector acts on or cites the contract without describing the label; a test rejects a prefix description at any orchestrator citation.

## Actual Behavior

Three citations describe a wider delete than the one statement performs. An agent reading only the SKILL.md sentence ("verified absent before Phase 0b") would, on a skip-note delta, look for a snapshot that the block deliberately kept — the shape of confusion that ends in a by-hand `rm` of a live halt snapshot, which is the loss bug 8 guarded against.

## Impact

Medium. No executed code is wrong; the rule is stated at four sites and three of them contradict the fourth on the one property (which label deletes) that this task exists to pin down — the enumeration class in `docs/reference/anti-patterns.md`.

## Recommendation

Reword the three sentences to `whose concern is exactly stale-snapshot: PR merged` (or drop the parenthetical and cite only); extend test D to assert that no orchestrator citation contains a prefix description (`starts \`stale-snapshot\``) and that each names the exact label or none.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 5)

**Root Cause Analysis**: the feat commit's Step 0a sentence described the label as the cycle-1 selector read it (`startswith`); cycle 2 changed the selector to exact equality and updated the contract, and test D read the three citations only for *whether* they cited, not for *what they said*, so the prefix wording survived three more cycles.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: The three citations now read "whose `concern` is exactly `stale-snapshot: PR merged` — the two `stale-snapshot check skipped …` notes share the prefix and are never deleted on". Test D now captures the citation sentence and asserts two things about it: it contains no prefix description (`starts|start with|starting with|prefix|startswith … stale-snapshot`) and it names the exact label; a citation that drops the label description entirely fails too, so the three sites can neither widen nor un-state the rule.

**Files Modified**:
- `skills/develop-task/SKILL.md:72`, `skills/develop-story/SKILL.md:76`, `skills/develop-bug/SKILL.md:73` — exact label in the citation
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — test D reads the citation's content (36/36)
- bundled `skills/*/references/` regenerated

**Testing**: D under the committed tree green; mutation: prefix wording restored in develop-story → D red; label description removed from develop-bug → D red. `ci:fast` 3574/3574; `eval:develop-task` 13/13; `bundle:check` 0; shellcheck clean.

**Verification Steps for QA**: `grep -rn -F 'starts \`stale-snapshot\`' skills/develop-*/SKILL.md` → 0 hits; `command node --test shared/resources/tests/stale-snapshot-delete.test.mjs` → D green; re-apply either mutation → D red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 5 (safety re-probe CR-1, confirmed by grep) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 6 (0 prefix hits; test D red under three independent mutations) |
