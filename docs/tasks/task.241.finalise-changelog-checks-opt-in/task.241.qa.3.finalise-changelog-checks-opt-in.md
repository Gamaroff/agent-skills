# QA Report: Task 241 - Make /finalise changelog checks opt-in (cycle 3)

**Task**: [Link to task document](./task.241.finalise-changelog-checks-opt-in.md)
**Gate File**: [task.241.gate.3.finalise-changelog-checks-opt-in.yml](./task.241.gate.3.finalise-changelog-checks-opt-in.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 re-reviewed head `93fb2108`, scoped to what changed since the cycle-2 gate's head
`f530a532`. CI is green on the head, including the zsh arm and the tmp-leak ratchet, so BUG-4 is
closed. The cycle-2 low findings are fixed and mutation-proven. The scoped review found 2 low
findings. Under route 2b (cosmetic residue) they were carried to `recommendations.future` rather
than spending a fix cycle on them.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| BUG-4 / CI-1: 6d temp-dir leak trips the ratchet | ✅ FIXED, closed | CI `test` green on `93fb2108` (run 40675928437). Mutation check: with the cleanup removed, `new prefix "finalise-6d"` and exit 1. |
| CR2-1: a missing resolver reads as "not enabled" | ✅ FIXED | 3b and 6d HALT `changelog-unknown`. Mutations: 6d guard, 2 red; 3b guard, 1 red; resolver change, 2 red. |
| CR2-2: bug DoD template placeholder | ✅ FIXED | The template copies agent 4's item, and the enumeration covers `assets/`. Reverting the template: red. |
| CR2-3: tiers split on deeper nesting | ✅ FIXED (documented and pinned) | Header text plus tests under both tiers. |
| CR2-4: upper-case-only enumeration | ✅ FIXED | Any case, with allowed spans cut out of the line. 2 mutations red. |
| CR2-5: comment names the wrong reader | ✅ FIXED | — |

## New Findings This Cycle

- **[low]** `evals/shared/tests/finalise-publish-boundary.test.mjs:839`: the allow-list span's `.*?`
  could swallow a real mention between its anchors. Use the literal middle text (CR3-1, carried).
- **[low]** `skills/finalise/SKILL.md:1847`: `changelog-unknown` is not named in the 6d heading,
  checklist or runbook (CR3-2, carried).

---

## Testing Scope

### Review Methodology

- **Approach:** direct tools, plus one independent Explore reviewer on the scoped diff.
  - Took 89.4 s (`duration_ms` 89414).
- **Re-review scope:** `f530a532..93fb2108`, minus bundled `references/` and `docs/tasks/`: 9 files,
  411 lines.
- **CI:** `CI on 93fb210830f0: green`. All six workflows passed.
- **Step 4b:** the changed 3b and 6d blocks are executed per PR by `finalise-publish-boundary.test.mjs`
  under bash locally, and under bash and zsh on CI. The missing-resolver and unloadable-reader cases
  are new.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: The resolver | PASS | Adds `unknown`, only for a broken install |
| Phase 2: Gate both call sites | PASS | Both sites HALT on any answer that is not `on` or `off` |
| Phase 3: Config and docs | PASS | `configuration.md` and `CHANGELOG.md` name the new HALT |
| Phase 4: Tests, bundle and record | PASS | CI green; ratchet ok |

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| Unset → 6d prints "not enabled" | PASS |
| Resolver gives the same answer under both tiers (single-line values directly under `changelog:`) | PASS |
| No dispatched prompt or template but agent 4 checks the changelog | PASS |
| `npm test` green | PASS. Local: 6,585 tests, 0 failed. CI: green. |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (both carried, route 2b)

---

## NFR Assessment

Security PASS (probe record from cycle 2 stands). Performance PASS. Reliability PASS. Maintainability
PASS.

---

## Code Review

**Correctness bugs (2):**
- [low/medium] `evals/shared/tests/finalise-publish-boundary.test.mjs:839`: the span `.*?` is too
  broad (CR3-1).
- [low/medium] `skills/finalise/SKILL.md:1847`: the new HALT token is not listed where 6d's outcomes
  are named (CR3-2).

Both anchors were checked with `finding-anchors.js`: `ok`. Neither is `bug` + `high` confidence.

**Mutation spot check:** 8 qa-fix mutations, all red. See the Re-Review Context table.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Local `ci:fast` | 6,585 tests, 0 failed, 14 skipped; `tmp-leak: ratchet ok` |
| CI on `93fb2108` | Test, ShellCheck, Validate Skills, Docs link check, Secret scan, Branch Policy: all success |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 96/100
**Deployment Recommendation**: READY

**QA Report**: co-located at `task.241.qa.3.finalise-changelog-checks-opt-in.md`
**Gate File**: co-located at `task.241.gate.3.finalise-changelog-checks-opt-in.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`.
