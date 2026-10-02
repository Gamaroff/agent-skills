# QA Report: Task 157 - Context-pressure trigger: recommend a continuation handoff before the context fills

**Task**: [Link to task document](./task.157.context-pressure-handoff-trigger.md)
**Gate File**: [task.157.gate.2.context-pressure-handoff-trigger.yml](./task.157.gate.2.context-pressure-handoff-trigger.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-review of PR #549 after qa-fix cycle 1 (`d10cb5ba`). All three gated findings from gate 1
are fixed and mutation-proven. The cycle-2 refute pass over the whole branch diff found one medium
and two low high-confidence bugs — in the installer's outcome reporting, the wrapper-path match, and
the new mode-keeping write cycle 1 added — so the gate stays CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — TASK-157-QA2-CR-1 fixed

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| TASK-157-CR-1 (medium) stale wrapper path on re-install | FIXED | test "re-install from another directory re-points…"; mutation reds it |
| TASK-157-CR-3 (low) uninstall drops containers it did not empty | FIXED | test "an empty container survives an uninstall that does write"; mutation reds it; residual (empty container present before install) documented and tested |
| TASK-157-CR-4 (low) malformed hooks shapes | FIXED | test "a hooks shape the transform cannot edit is refused…"; mutation reds it |

Advisory CR-2, CR-5, CR-6, CR-7, CR-8 from gate 1 were also fixed in `d10cb5ba`.

---

## New Findings This Cycle

- **[medium]** `shared/resources/context-pressure.mjs:479` — QA2-CR-1: an uninstall that meets a wrap
  it cannot parse (no hook present) reports "not installed — no change", and the installer prints
  "unchanged" and exits 0 → give needs-manual-fix its own outcome.
- **[low]** `shared/resources/context-pressure.mjs:364` — QA2-CR-2: wrapper match takes the first
  substring hit, so a directory path containing the wrapper's filename breaks the round trip →
  anchor the match.
- **[low]** `shared/resources/context-pressure-install.sh:106` — QA2-CR-3: the mode-keeping write
  fails on a read-only settings file after overwriting the `.bak` → write first, then apply the mode.
- Advisory: QA2-CR-4 (identity match not anchored to a path segment), QA2-CR-5 (race worst case
  understated in the header), QA2-CR-6 (SKILL.md dangling clause), QA2-CR-7 (redundant `mv` hop).

---

## Testing Scope

### Review Methodology

Re-review, cycle 2 — **refute pass** over the whole branch diff (`origin/develop...HEAD`, task docs
and the byte-identical bundled copies excluded; 1711 lines), as the cycle-2 rule requires. One
read-only Explore subagent; `duration_ms` 189362. `SAFETY_REPROBE=false` (gate 1 security PASS,
evidence measured).

Re-review scope: unscoped — cycle 2 refute pass (whole branch diff)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Engine | PASS | writeAtomic tmp cleanup added and tested |
| Phase 2: Wrapper | PASS | unchanged this cycle |
| Phase 3: Installer | CONCERNS | QA2-CR-1, CR-2, CR-3 |
| Phase 4: Docs, bundle, changelog | PASS | install check now two prompts; `bundle:check` 0 problems |

---

## Success Criteria Verification

Unchanged from cycle 1 except: install/uninstall round trip now also holds when an empty container
must survive a writing uninstall (new test). Performance untouched this cycle.

---

## Breaking Changes Validation

None. **PASS**

---

## NFR Assessment

### Performance — PASS
No change to `record` / `check` beyond the failure-path unlink.

### Reliability — PASS
Contract, wrapper and installer suites hold; the open findings are reporting and edge-case defects.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20
- `validSessionId` re-probed (`task.157.qa.2.security.run.json`, same session-id corpus): engages, 0
  reproduced.

### Maintainability — PASS
Each cycle-1 fix has a committed test that its mutation reds.

---

## Code Review

**Boundary rule**: `validSessionId` — probed, `probes_executed: 20`. `unshq` — `boundary: internal`
(unchanged reasoning, cycle 1).

**Correctness bugs (5):** QA2-CR-1 [medium/high], QA2-CR-2 [low/high], QA2-CR-3 [low/high] (gated);
QA2-CR-4 [low/medium], QA2-CR-5 [low/medium] (advisory).

**Cleanups (2):** QA2-CR-6 `skills/session-handoff/SKILL.md:298` dangling clause; QA2-CR-7
`shared/resources/context-pressure-install.sh:107` redundant `mv` hop.

Promoted to `top_issues` (`code_review_blocking=true`): QA2-CR-1, CR-2, CR-3. All in files this branch
adds — none pre-existing.

**Mutation proofs (cycle 1 fixes):**
- mutation-proven: CR-1 re-point branch → "re-install from another directory re-points an existing wrap…" → covered
- mutation-proven: CR-3 early return → "an empty container survives an uninstall that does write…" → covered (first attempt absorbed by the `changed` flag; the writing case was added)
- mutation-proven: CR-4 shape assertion → "a hooks shape the transform cannot edit is refused…" → covered
- mutation-proven: CR-6 keep-mode move → "the settings file keeps its own mode…" → covered
- mutation-proven: CR-8 tmp unlink → "a failed state write leaves no .tmp behind…" → covered

**Step 4b**: `skills/session-handoff/SKILL.md` — 5 bash blocks, all refused as mutating:
`no-executable-blocks` (information).

**Platform variance**: `TMPDIR=/tmp command node --test shared/resources/tests/context-pressure*.test.mjs` → 38/38.

---

## Regression Testing

`npm run ci:fast` on the fix tree: 4975/4976 pass, 1 skipped, 0 fail. **PASS**

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/context-pressure*.test.mjs
TMPDIR=/tmp command node --test shared/resources/tests/context-pressure*.test.mjs
npm run ci:fast
npm run validate -- skills/session-handoff/
command node .agents/skills/qa-task/references/security-probe.mjs --cases-file docs/tasks/task.157.context-pressure-handoff-trigger/task.157.qa.2.security.cases.json --sink filename --entry 'shared/resources/context-pressure.mjs#validSessionId' --record docs/tasks/task.157.context-pressure-handoff-trigger/task.157.qa.2.security.run.json --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; every NFR PASS; one MEDIUM high-confidence installer reporting bug.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — QA2-CR-1 fixed

**Next Steps**: `/qa-fix` cycle 2, then re-review (cycle 3).
