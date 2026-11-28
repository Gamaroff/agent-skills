# QA Report: Task 332 - The AC merge closes task 331's follow-ups (cycle 3)

**Task**: [Link to task document](./task.332.ac-merge-closes-task-331-follow-ups.md)
**Gate File**: [task.332.gate.3.ac-merge-closes-task-331-follow-ups.yml](./task.332.gate.3.ac-merge-closes-task-331-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: PASS

---

## Executive Summary

Re-review of head `4ccb29fcd`, the qa-fix cycle 2 commit. Gate 2's finding is fixed, and so is the
zsh `--sha256` defect its test exposed. The scoped review found two low advisories, routed to
`recommendations.future`.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T332-CR2-1 — hand copy after a successful extract refused as `result-hash-mismatch`, no arm | ✅ FIXED | blocks case: refused in its own arm with a remedy, then merged once the remedy is followed (bash, zsh) |
| T332-CR2-2 — zsh passed `--sha256 <hex>` as one word | ✅ FIXED | array form; the zsh case of the new test merges |

Re-review scope: files changed since gate 2 (head ce71df6aaac6; 6 files) — default

## New Findings This Cycle

- **[low, advisory]** `skills/finalise/SKILL.md:1044` — the hand-copy-over-an-extract route merges
  as `verified: false` with no DoD disclosure line → extend the prose (CR3-1).
- **[low, advisory]** `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:519` — assert
  `result.verified === false` as well (CR3-2).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#964)

### Review Methodology

Direct tools plus one read-only Explore reviewer over the scoped diff. Diff review: code review.
Reviewer duration 86745 ms (completion notice `duration_ms`).

CI on 4ccb29fcdbb3: pending

Step 4b: as in cycles 1 and 2 — the changed Step 3c block is `mutating` (writes `.claude/state/`),
0 executed by the engine; the committed blocks test runs it under bash and zsh: 20/20.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: merge requires `--doc` and a named `story_file` | PASS | Verified | |
| Phase 2: stem-keyed scope/extract files | PASS | Verified | |
| Phase 3: split refusals and Step 3c arms | PASS | Verified | every arm's remedy clears in sequence |
| Phase 4: docs and CHANGELOG | PASS | Verified | entry extended for cycle 2 |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

Criteria unchanged since review (`criteria-drift.js`: clean, base review-commit).

| Check | Result |
| --- | --- |
| Full `ci:fast` on the LAN server at this tree | 8980 tests, 8977 pass, 0 fail, 3 skipped |
| `npm run validate -- skills/finalise/` | ✓ finalise |
| `changelog-cites.sh task.332` | `cites (task 332)`, rc 0 |
| `probe-boundary-signals.mjs` | `[]` |

---

## Breaking Changes Validation

Unchanged: documented in the CHANGELOG with migration. PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Every Step 3c document HALT has a remedy that clears it.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 — `boundary: internal`, reason unchanged.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `skills/finalise/SKILL.md:1044` — hand copy over an extract has no DoD disclosure → extend prose. Advisory.

**Cleanups (1):**
- `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:519` — also assert `result.verified === false`.

Anchors: `finding-anchors.js --rev HEAD` → ok for both.

mutation-proven: `AC_SHA_ARGS` never set (no `--sha256` passed) → `[bash]`/`[zsh] Step 3c after a successful extract: a corrected hand copy HALTs in the hash arm with its remedy, and following that remedy merges (T332-CR2-1)` went red → covered

Restored from a `cp` snapshot; `cmp` clean; baseline 20/20.

---

## Regression Testing

Full `ci:fast` on the LAN server: 0 failures.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; every fix this task made is held by a committed test that goes red without it.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

**Next Steps**: `/review-pr` (Step 5c), then `/finalise`.
