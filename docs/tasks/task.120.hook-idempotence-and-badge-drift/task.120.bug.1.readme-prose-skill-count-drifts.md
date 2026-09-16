# Bug Report: Task 120 - README prose skill count is a second hand-typed number the generator does not own

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-16

## Description

Phase 3 makes `generate_catalog.py` own the README skills badge (`skills-<N>-`), and the badge on the branch now reads 128. Two lines below it, `README.md:7` still says **"126 skills covering development, story management, QA, PM, architecture, validation, and more."** — a second hand-typed count that nothing generates and nothing checks. The README now contradicts itself on the same screen, and this number will drift exactly as the badge did: it is one behind today, and the task exists because "a human remembering" is not a mechanism.

Surfaced by the Step 3b diff review (CR-4, rated a cleanup there); promoted to a QA finding because it is the same defect class the task closes, in the same file, and the task's own Key Deliverable 3 reads "a README badge that the catalog generator owns, caught by the existing CI no-diff check when it drifts" — a count the generator does not own, sitting beside the one it does, is the half-fix.

## Steps to Reproduce

1. `sed -n '5,7p' README.md` — the badge line reads `skills-128-`; the prose reads `126 skills covering`.
2. `python3 skills/create-skill/scripts/generate_catalog.py && git diff --quiet README.md` — exits 0: the generator considers the README current.

## Expected Behavior

Every skill count in `README.md` is either generated (rewritten by `update_readme_badge()` — or a sibling — from the same `total`) or absent. `validate.yml`'s no-diff check then owns all of them.

## Actual Behavior

The badge is generated; the prose count is not. The CI check passes over a README that states two different totals.

## Impact

Reader-facing contradiction in the repository's front page; the exact drift mechanism task.120 is removing survives in the adjacent sentence. No runtime impact.

## Recommendation

Extend `update_readme_badge()` to also rewrite the prose count — anchored on the literal phrase `\b\d+ skills covering` so no other number is touched — and add a fixture line to `tests/generate-catalog-badge.test.js` that asserts both the badge and the prose are rewritten while an unrelated number in prose is not. Alternatively drop the number from the sentence ("A library of skills covering …"); either way the README must carry one generated total or none. Run the generator once and commit the README.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 1)

**Root Cause**: `update_readme_badge()` rewrote exactly one site — the shields.io badge segment — because the task specified the badge and nothing else. The sentence two lines below carried the same count by hand, and the task's own premise (a count only a human bumps will drift) applied to it unchanged.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `skills/create-skill/scripts/generate_catalog.py`: new `PROSE_COUNT = re.compile(r"\b\d+( skills covering\b)")`; `update_readme_badge()` rewrites it from the same `total` after the badge (still `count=1`, still gated on the badge being present so a README without the badge stays untouched). Success message reports `badge + prose count` or `badge` so the output says which sites it owned.
- `README.md`: regenerated — prose now reads "128 skills covering …", matching the badge.

**Files Modified**:
- `skills/create-skill/scripts/generate_catalog.py`
- `README.md` (generated)
- `tests/generate-catalog-badge.test.js` — 2 new tests: prose count rewritten while an unrelated number and year in the same sentence are not; badge-only README rewritten at the badge only

**Testing**:
- `node --test tests/generate-catalog-badge.test.js` — 7/7
- mutation-proven: `PROSE_COUNT.subn` removed → "the prose skill count beside the badge is generated too" red → **covered**
- `python3 skills/create-skill/scripts/generate_catalog.py && git diff --quiet docs/reference/skill-catalog.md README.md` — clean after regeneration

**Verification Steps for QA**:
1. `sed -n '5,7p' README.md` — badge and prose both read 128.
2. Set the prose to 999, run the generator — it comes back to 128; set an unrelated number in prose — untouched.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 1 (CR-4 promoted) |
| 2026-09-16 | In Progress | qa-fix | Investigation — single-site rewrite |
| 2026-09-16 | Ready for QA | qa-fix | Prose count generated from `total`; tests + mutation proof |
| 2026-09-16 | Closed | QA Engineer | Verified in QA cycle 2: 999 → 128 via the generator, unrelated numbers untouched, README identical to HEAD |
