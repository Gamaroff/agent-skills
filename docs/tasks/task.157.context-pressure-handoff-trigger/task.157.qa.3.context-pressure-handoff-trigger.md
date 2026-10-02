# QA Report: Task 157 - Context-pressure trigger: recommend a continuation handoff before the context fills

**Task**: [Link to task document](./task.157.context-pressure-handoff-trigger.md)
**Gate File**: [task.157.gate.3.context-pressure-handoff-trigger.yml](./task.157.gate.3.context-pressure-handoff-trigger.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 re-review after qa-fix cycle 2 (`6c051d54`). Gate 2's three gated findings are fixed and
mutation-proven. The scoped review found that the newly anchored wrap regex fails on the installer's
own output when the wrapper path contains an apostrophe (medium), and that the `.bak` is deleted
before its replacement is copied (low). Gate stays CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — TASK-157-QA3-CR-1 fixed

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| QA2-CR-1 (medium) needs-manual shared an outcome with unchanged | FIXED | two ACTION NEEDED tests; mutation reds both |
| QA2-CR-2 (low) wrapper match not anchored | FIXED for the directory case | round-trip test; mutation reds it — but see QA3-CR-1 |
| QA2-CR-3 (low) read-only settings failed | FIXED | 0444 test; mutation reds it |

---

## New Findings This Cycle

- **[medium]** `shared/resources/context-pressure.mjs:326` — QA3-CR-1: `WRAP_RE` does not match
  `wrapCommand` output for a wrapper path containing `'` (shq's escape sequence), so re-install
  double-wraps and uninstall leaves the wrap; the earlier substring test handled it.
- **[low]** `shared/resources/context-pressure-install.sh:122` — QA3-CR-3: the old `.bak` is removed
  before the new one is copied.
- Advisory: QA3-CR-2 (path-qualified shell, backslash separators), QA3-CR-4 (a stray regex literal
  left from an earlier draft), QA3-CR-5 (dead `.replace` in `unwrapCommand`).

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head d10cb5ba1f26; 4 non-doc files) — default.
One read-only Explore subagent; `duration_ms` 79038. `SAFETY_REPROBE=false`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Engine | PASS | unchanged except race note |
| Phase 2: Wrapper | PASS | unchanged |
| Phase 3: Installer | CONCERNS | QA3-CR-1, QA3-CR-3 |
| Phase 4: Docs, bundle, changelog | PASS | `bundle:check` 0 problems |

---

## Breaking Changes Validation

None. **PASS**

---

## NFR Assessment

### Performance — PASS
No hot-path change.

### Reliability — PASS
Contract and wrapper suites hold; open findings are identity and backup edge cases.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20
- `validSessionId` re-probed (`task.157.qa.3.security.run.json`): engages, 0 reproduced.

### Maintainability — PASS
Cleanups QA3-CR-4 and QA3-CR-5 noted.

---

## Code Review

**Boundary rule**: `validSessionId` probed (`probes_executed: 20`); `unshq` `boundary: internal`.

**Correctness bugs (3):** QA3-CR-1 [medium/high], QA3-CR-3 [low/high] (gated); QA3-CR-2 [low/medium] (advisory).
**Cleanups (2):** QA3-CR-4 `shared/resources/context-pressure.mjs:328`; QA3-CR-5 `shared/resources/context-pressure.mjs:375`.

Promoted to `top_issues`: QA3-CR-1, QA3-CR-3. None pre-existing.

**Mutation proofs (cycle 2 fixes):**
- mutation-proven: outcome needs-manual → both "ACTION NEEDED" tests → covered
- mutation-proven: WRAP_RE program anchoring → "a wrapper directory that contains the wrapper's own name round-trips" → covered
- mutation-proven: chmod after write → "a read-only settings file installs…" and the CR-6 mode test → covered
- mutation-proven: HOOK_RE anchoring → "another tool's hook … is not ours" → covered

**Step 4b**: 5 bash blocks, all refused as mutating — `no-executable-blocks`.
**Platform variance**: `TMPDIR=/tmp` → 43/43.

---

## Regression Testing

`npm run ci:fast`: 4980/4983. The two failures (`tests/bundle-missing-source.test.js`,
`tests/test-clean-checkout.test.js`) are LOAD-SENSITIVE file budgets that fail identically on a clean
`origin/develop` worktree at the same load — pre-existing. **PASS**

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — QA3-CR-1 fixed
**Next Steps**: `/qa-fix` cycle 3 — replace the regex identity with a shell-word parse (third cycle on the same subject).
