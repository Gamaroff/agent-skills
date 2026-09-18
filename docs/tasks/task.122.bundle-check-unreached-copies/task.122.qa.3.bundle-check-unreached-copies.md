# QA Report: Task 122 - Twelve skills carry bundled copies no discovery rule reaches (cycle 3)

**Task**: [task.122.bundle-check-unreached-copies.md](./task.122.bundle-check-unreached-copies.md)
**Gate File**: [task.122.gate.3.bundle-check-unreached-copies.yml](./task.122.gate.3.bundle-check-unreached-copies.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 re-review, scoped to the files changed since gate 2. Both cycle-2 findings are verified fixed
on `97f66ae1`: the in-tree symlinked-intermediate reproduction now reports `SYMLINK x2` and never
`MISSING` (check equals writer), and every description of the containment rule states the shipped one.
QA's mutant on the new check branch goes red; the scoped reviewer returned no findings. Nothing about the
deliverable changed: 0 UNREACHED across 128 skills.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task at `ready-for-review`; PR #434 OPEN (head `97f66ae1`)
- [x] Bug report 1 Closed (cycle 2)

### Review Methodology

Re-review, cycle 3: `PRIOR_GATES=2` → scoped. Direct tools plus one read-only reviewer (183s).

Re-review scope: since 2026-09-18T11:28:17Z (default) — 7 files (`bundle_skill.py`,
`bundle-check-mode.test.js`, `CHANGELOG.md`, the task doc, bug 1, gate 2, QA 2); scoped patch 1666
lines, non-empty. `SAFETY_REPROBE=false` (gate 2: security `PASS measured`, no high entries, gate
CONCERNS).

Step 4b: not applicable — no `SKILL.md` or `shared/resources/*.md` changed since gate 2.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-122-CR2-1 — check has no symlinked-intermediate branch (in-tree link → MISSING under regenerate remedy) | **FIXED** | Repro on `97f66ae1`: writer `SKIPPED references/sub/s.md — under a symlinked directory`; check `SYMLINK references/sub/s.md — under symlinked directory references/sub -> real` + `SYMLINK references/sub`; **no MISSING**. QA mutant (branch disabled) → "an IN-TREE symlinked intermediate directory reports SYMLINK, never MISSING" red → `covered`. |
| TASK-122-CR2-2 — docstring claims `rglob` follows symlinked dirs; CHANGELOG says "now lexical" | **FIXED** | docstring: "followed them before Python 3.13 and does not on 3.13+"; CHANGELOG: "resolves the parent and judges the leaf lexically"; `now lexical` count 0; task Files Summary line corrected too. |
| CR-3 (advisory) `_within` simplification | FIXED | `is_relative_to` only; `''` arm dropped with the reason in the docstring; dev mutants M7/M8 red. |

---

## New Findings This Cycle

None. Searched scoped (default): the 7 files changed since gate 2, 1666-line patch; reviewer verified
the new check branch (`component.relative_to(refs_dir)` always succeeds for a parent under
`refs_dir`; `os.readlink` only reached when `is_symlink()`; ordering after the leaf-symlink test and
before `exists()` misclassifies nothing) and confirmed the fixture fails with the branch removed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1–3 | PASS | Verified | unchanged; `--check`: 128 skills, 0 problems |

## Success Criteria Verification

All Functional, Performance, Code Quality criteria PASS (unchanged). Migration: 12 copies gone;
observation #118 to be ticked `actioned` at finalise with PR #434.

## Breaking Changes Validation

None declared; N/A. PASS.

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Evidence**: measured · **Probes executed**: 13 (cycle-1/2 hand probe; the cycle-2 simplification
  of `_within` is behaviour-preserving — M7/M8 mutants red)
### Maintainability — PASS
Module invariant restored; every description of the rule is the shipped one.

---

## Code Review

Step 3b — scoped pass (cycle 3). `CR_BLOCKING=true`. **Correctness bugs (0). Cleanups (0).**
`probes_executed: 13` (carried; the sink's behaviour is unchanged this cycle and re-verified by the
suite). Mutation proofs (QA): check branch disabled → in-tree test red → **covered**.
Platform variance: `TMPDIR=/tmp` 43/43. Working tree unchanged after review.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundler suites (5 files) | PASS — 79/79 |
| `npm run ci:fast` (qa-fix run on this tree, pre-commit) | PASS — 3454/3454 |
| `npm run bundle:check` | PASS — 128 skills, 0 problems |
| Pre-commit bundler hook on `97f66ae1` | all in sync |

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Tick observation #118 at finalise (PR #434); observation #125 follow-up (develop's `change-log.js` citation).

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment Recommendation**: APPROVED

**QA Report**: `task.122.qa.3.bundle-check-unreached-copies.md` · **Gate File**: `task.122.gate.3.bundle-check-unreached-copies.yml`
**Next Steps**: 5c `/review-pr`; then `/finalise`.
