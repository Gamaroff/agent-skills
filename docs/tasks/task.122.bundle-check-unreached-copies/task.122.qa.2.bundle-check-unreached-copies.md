# QA Report: Task 122 - Twelve skills carry bundled copies no discovery rule reaches (cycle 2)

**Task**: [task.122.bundle-check-unreached-copies.md](./task.122.bundle-check-unreached-copies.md)
**Gate File**: [task.122.gate.2.bundle-check-unreached-copies.yml](./task.122.gate.2.bundle-check-unreached-copies.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-review (refute pass over the whole branch). TASK-122-BUG-1 is **fixed and verified**: the
bug's own reproduction now prints `refusing out-of-tree reference: sub/s.md` and writes nothing
outside; the 13-shape hand probe refuses both symlink shapes, bare `..` and empty; QA's independent
mutants red the new fixtures. The refute pass then found what cycle 1's fix itself introduced: for an
**in-tree** symlinked intermediate the writer refuses the copy while `--check` names it `MISSING` under
the regenerate remedy that cannot clear it (reproduced), and two descriptions of the shipped rule —
`_symlinked_component`'s docstring and the CHANGELOG sentence — describe the cycle-1 rule instead.
Low severity, cheap, but a broken module invariant and a false release note → CONCERNS, one more cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR2-1 and CR2-2 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task at `ready-for-review`, 3/3 phases ticked; PR #434 OPEN (head `7252be6f`)
- [x] Bug report 1 at Ready for QA with Investigation / Fix Implementation populated

### Review Methodology

Re-review, cycle 2: `PRIOR_GATES=1` → **whole-branch diff, refute directive** (5730 lines). Direct
tools plus one read-only refute reviewer (409s).

Re-review scope: unscoped — cycle 2 is always the whole branch, reviewed to refute.
`SAFETY_REPROBE=false` (clause 1: `OK measured`; clause 2 needs `high` and BUG-1 was medium;
clause 3 needs `FAIL`). The boundary was re-probed anyway (below) because BUG-1 *was* a boundary.

Step 4b: fired on `skills/create-skill/SKILL.md` (re-edited, CR-4) — `no-executable-blocks` (3
blocks, all deny-listed). Recorded.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-122-BUG-1 — lexical `_within()` accepted a symlinked intermediate; write gate leaf-only | **FIXED** | Repro against `7252be6f`: `refusing out-of-tree reference: sub/s.md`, outside dir empty. Hand probe (13 shapes, `env -i`): `symlink-escape`, `symlink-dotdot`, bare `..`, empty, all `..` traversals refused; legitimate shapes accepted; `encoded-traversal` literal filename; `null-byte` refused by `is_file()`. QA mutants: QA-M1 (parent not resolved) → "cited name under a symlinked intermediate…" red; QA-M2 (leaf-only gate) → "reconciled copy under a symlinked intermediate…" red; QA-M3 (depth +1) → no red — equivalent unless `references/` itself is a link (`absorbed`). Depth arithmetic checked for `s.md` (0 parents), `sub/s.md` (1), `a/b/c.md` (2, excluding `references/`), `sub/` (0). |
| CR-2 shadowed `name` | FIXED | inner capture is `invoked` |
| CR-3 dead set difference | FIXED | `sorted(reconcilable)`; comment states disjointness |
| CR-4 duplicate remedy spelling | FIXED | sentence reworded without the literal pass 3 rewrites; 4b clean |

Bug report 1 → **Closed** (QA verified).

---

## New Findings This Cycle

- **[low]** `skills/create-skill/scripts/bundle_skill.py:713` — `check_skill`'s expected-loop has no
  branch for a symlinked *intermediate*: an in-tree link `references/sub → real` passes the
  parent-resolving `_within` into `needed`, `writable_copy` refuses it, and the check reports the name
  `MISSING` under "run `npm run bundle`" — reproduced (`SKIPPED references/sub/s.md — under a
  symlinked directory` / `MISSING x1 — run npm run bundle`, beside a correct `SYMLINK` for the link
  itself). → report such a name as `SYMLINK` (component in the detail) before the `exists()` test;
  fixture with an in-tree link; mutation-prove. **TASK-122-CR2-1** (reviewer CR-1, low/medium → QA
  reproduced, confidence high).
- **[low]** `bundle_skill.py:453` + `CHANGELOG.md:23` — `_symlinked_component`'s docstring asserts
  `Path.rglob` follows a symlinked directory; false on the host (3.13.7) and CI (`3.x`), and the test
  beside the fixture says the opposite. The CHANGELOG still says `_within` is "now lexical" — the
  cycle-1 rule BUG-1 replaced. → reword both. **TASK-122-CR2-2** (reviewer CR-2 + CR-4).
- **[low, advisory]** `_within`: the `''` leaf arm is unreachable from the only call shape and
  `parent == root_r` is implied by `is_relative_to` (reviewer CR-3) → `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `UNREACHED` | PASS | Verified | unchanged since cycle 1 |
| Phase 2: invocation rule + respell | PASS | Verified | unchanged |
| Phase 3: deletions | PASS | Verified | `--check`: 128 skills, 0 problems |

Cycle-1 fix: `_within` (parent resolved, leaf lexical, `..`/empty refused), `_symlinked_component`,
`_skip_reason`, `writable_copy`, `discover_needed` `is_file()`; 5 fixtures (37 → 42). Verified.

---

## Success Criteria Verification

Unchanged from cycle 1 — all Functional, Performance and Code Quality criteria PASS; Migration:
observation #118 to be ticked at finalise.

---

## Breaking Changes Validation

None declared; verified (N/A). PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (3)

TASK-122-CR2-1, TASK-122-CR2-2 (gating via maintainability CONCERNS; both open in `top_issues[]`);
CR-3 advisory. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
One `resolve()` per candidate parent and one parents walk per write; live `--check` ≈6s as before.

### Reliability — PASS
Fix mutation-proved by dev (M1–M5) and QA (QA-M1/M2 covered, QA-M3 absorbed); directory citation no
longer crashes; reconciliation fixture asserts the outcome and probes the gate directly, so it does
not depend on the interpreter's `rglob` semantics.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 13 (hand probe under `env -i`; engine declines the Python sink). Both
  regressions from cycle 1 refused; every `..` traversal, absolute path, bare `..` and empty refused;
  legitimate nested / dots-in-name / leading-dot accepted.

### Maintainability — CONCERNS
Check/writer divergence for an in-tree symlinked intermediate (CR2-1); docstring and CHANGELOG
describe the superseded rule (CR2-2).

---

## Code Review

Step 3b — **refute pass** (cycle 2, whole branch). `CR_BLOCKING=true`.

**Correctness bugs (1):**
- [low/medium → QA-reproduced, **high**] `bundle_skill.py:713` — check has no symlinked-intermediate
  branch; in-tree link → writer skips, check says regenerate. **Promoted to gate as TASK-122-CR2-1.**

**Cleanups (3):** CR-2 docstring falsehood + CR-4 CHANGELOG wording (promoted together as
TASK-122-CR2-2 — a false description of a containment rule is not cosmetic); CR-3 `_within`
simplification (advisory).

`probes_executed: 13`. Provenance: CR2-1 reproduces on the branch only (the cycle-1 code path did
not exist on `develop`) → attributable.

**Mutation proofs (QA, this cycle):**
- mutation-proven: `_within` parent lexical → `a cited name under a symlinked intermediate directory is refused…` → **covered**
- mutation-proven: `writable_copy` leaf-only → `a reconciled copy under a symlinked intermediate directory is refused by the write gate` → **covered**
- mutation-proven: `_symlinked_component` depth +1 → (nothing) → **absorbed** (equivalent unless `references/` is itself a link)

Platform variance: `TMPDIR=/tmp node --test tests/bundle-check-mode.test.js` → 42/42.
Working tree unchanged after review (`git status --porcelain` diff empty).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundler suites (5 files) | PASS — 78/78 |
| `npm run ci:fast` (qa-fix run on the same tree, pre-commit) | PASS — 3453/3453 |
| `npm run bundle:check` | PASS — 128 skills, 0 problems |
| Pre-commit bundler hook on `7252be6f` | all in sync |

---

## Test Artifacts

### Files Reviewed
`skills/create-skill/scripts/bundle_skill.py`, `tests/bundle-check-mode.test.js`,
`skills/create-skill/SKILL.md`, `CHANGELOG.md`, bug report 1.

### Test Commands Executed
```bash
node --test tests/bundle-check-mode.test.js tests/bundle-transitive.test.js tests/bundle-link-rewrite.test.js tests/bundled-links.test.js tests/bundle-comment-origin.test.js
TMPDIR=/tmp node --test tests/bundle-check-mode.test.js
npm run bundle:check
python3 skills/create-skill/scripts/bundle_skill.py <fixture>          # BUG-1 repro; CR2-1 repro (+ --check)
node references/qa-execute-snippets.mjs --file skills/create-skill/SKILL.md --json
# hand probe: env -i PATH=… HOME=$(mktemp -d) python3 probe.py (13 shapes)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-122-CR2-1 — `check_skill` SYMLINK branch for a symlinked intermediate + in-tree fixture + mutation proof.
2. TASK-122-CR2-2 — docstring and CHANGELOG wording.

### Short-term Actions (Non-Blocking)
1. CR-3 `_within` simplification.
2. Tick observation #118 at finalise.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: BUG-1 closed; the fix introduced one low check/writer divergence and two false
descriptions of the rule (maintainability CONCERNS → rule 4).
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-1 and CR2-2 fixed

---

**QA Report**: co-located at `task.122.qa.2.bundle-check-unreached-copies.md`
**Gate File**: co-located at `task.122.gate.2.bundle-check-unreached-copies.yml`
**Next Steps**: `/qa-fix` on gate 2; cycle 3 re-review (scoped since this gate).
