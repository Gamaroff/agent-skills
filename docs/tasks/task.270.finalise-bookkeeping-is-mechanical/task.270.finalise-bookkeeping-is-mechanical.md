---
id: task.270
title: "finalise bookkeeping is mechanical"
type: task
description: "Close three finalise bookkeeping gaps that a person had to notice by hand: a GAPS bug DoD that reads as accepted, security probe artefacts left untracked after the acceptance commit, and a DoD number that collides with another writer's files."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
pr_number: 858
priority: Medium
created: 2026-11-06
updated: 2026-11-07
estimated_effort_hours: 4
---

# Task 270: finalise bookkeeping is mechanical

**Status:** Ready for Review

---

## 1. Overview

Three small finalise defects share one cause: a step relies on a person or a prose sentence where a script could check (obs #37, #59, #96). Each is a script change with a test.

**Scope**: `fill-verification-complete.sh`, the 6a staging block and the `DOD_N` allocation call.

---

## 2. Motivation

### Current Problems

1. **A GAPS file reads as accepted** (obs #37). On bug.19 DoD run 1, `fill-verification-complete.sh <dod> gaps` filled only `**Final Status:**` and `**Completion Time:**`; the CI-reading line, "committed and pushed at 6a", the Status History row and the Part B next-step stayed as accepted-path text.
2. **Untracked probe sidecar** (obs #59). The DoD security probe writes `{stem}.dod.{N}.security.run.json` and a `.run.json.d/` sidecar; the prose says 6a carries them, and no block stages them. On task.212 the sidecar needed a second commit.
3. **A foreign file takes the DoD number** (obs #96). On task.217 `DOD_N=1` collided with an existing `task.217.dod.1.security.cases.1.json`. The runner rewrote it byte-identically, which was luck.

### Benefits

1. A GAPS file cannot be mistaken for an accepted one.
2. "6a carries them" becomes a fact, not a claim.
3. The DoD number is the next free one in its whole namespace.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/fill-verification-complete.sh:95` halts only when the Final Status placeholder survives; no check covers the other placeholders in the block (`grep -n -i placeholder` returns lines 8, 27, 95 only). The template is `skills/finalise/assets/bug-dod-template.md`.
- `skills/finalise/SKILL.md:1910` and `:1913` build `ADD_PATHS` as the document, the DoD and (non-bug) `sprint-review-summary.md`; no `security.*` path is added (`grep -n ADD_PATHS skills/finalise/SKILL.md`, 2026-11-07; the `:1834`/`:1837` first written here had drifted). `:503` and `:661` show the artefact names. The 6a block binds `STEM`, `DOC_KIND` and `DOD_PATH` only: `DOD_N` is **not** an input of that block, so the staging edit derives the run number from `DOD_PATH`.
- Finalise 7.1 calls `fill-verification-complete.sh "$DOD_PATH" accepted` (`SKILL.md:1601`) while the template's `**CI reading 1:** {CI_ROLLUP} @ \`{CI_HEAD_1}\`` line is still unfilled, so a halt on any surviving `{…}` would fire on every accepted bug run unless Phase 1 fixes the order (see Phase 1).
- `skills/finalise/SKILL.md:173` allocates `DOD_N=$(next_numbered "{document-directory}" dod -name "${STEM}.dod.*.md")`. `shared/resources/newest-numbered.sh:50` `next_numbered` takes HIGHEST + 1 over the `-name` patterns it is given, so a narrower pattern misses `.dod.N.security.*` files. Obs #96 measured: with `task.9.dod.1.x.md` and a foreign `task.9.dod.2.security.cases.1.json`, the narrow pattern answers 2 and `-name 'task.9.dod.*'` answers 3.
- Tests beside it: `shared/resources/tests/finalise-gaps-path.test.mjs`, `finalise-6a-registry-staging.test.mjs`.

### Target Architecture

- `fill-verification-complete.sh` halts when any `{…}` placeholder survives in the block after the fill; for `gaps`, the accepted-path lines are replaced with verdict-specific text (obs #37, both options named; the plan chooses the halt plus a neutral template).
- 6a adds every `${STEM}.dod.${DOD_N}.security.*` path, including the `.run.json.d/` directory, to `ADD_PATHS` when present (obs #59).
- `DOD_N` counts every `${STEM}.dod.*` entry in the directory (obs #96).

### Important Clarifications

- Whether `review-pr` still writes the `{id}.dod.{N}.…` namespace is unestablished (obs #96, 2026-11-04). The fix does not depend on it.
- The plan checks which option for #37 keeps `finalise-bug-mode.test.mjs`'s table/marker agreement intact.

---

## 4. Scope

### In Scope

✅ **The fill script** halt and the gaps text.
✅ **6a staging** of the security artefacts.
✅ **`DOD_N` allocation** over the whole namespace.
✅ **Tests** with a control each.

### Out of Scope

❌ **Renaming review-pr's corpus.**
❌ **The probe record format.**

---

## 5. Breaking Changes

None for consumers once Phase 1 pins the order: the halt must not fire on a placeholder that a later step of the same accepted run fills (`{CI_ROLLUP}`, `{CI_HEAD_1}`). A surviving placeholder that nothing later fills used to pass and now halts, which is the intended fix.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.270.plan.finalise-bookkeeping-is-mechanical.md](task.270.plan.finalise-bookkeeping-is-mechanical.md)

### Phase 1: The fill script

**Risk Level**: Medium

**Files**:
- `shared/resources/fill-verification-complete.sh`
- `skills/finalise/assets/bug-dod-template.md`

**Changes**:
- [ ] Halt when a `{…}` placeholder survives the fill, naming it.
- [ ] Make the block's accepted-path lines verdict-neutral or verdict-filled for `gaps`.

**Dependencies**: none.

---

### Phase 2: 6a staging

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md` (6a block near `:1834`)

**Changes**:
- [ ] Append `"$DOC_DIR/$STEM.dod.$DOD_N.security."*` matches, including the `.d/` directory, when they exist.

**Dependencies**: none.

---

### Phase 3: DOD_N namespace

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md` (`:173`)

**Changes**:
- [ ] Widen the pattern to `"${STEM}.dod.*"`.

**Dependencies**: none.

---

### Phase 4: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Tests and mutation proofs (§ 8).
- [ ] `command npm run bundle`, `command npm run bundle -- --check`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/fill-verification-complete.sh` - placeholder halt
2. ✅ `skills/finalise/assets/bug-dod-template.md` - verdict-neutral block
3. ✅ `skills/finalise/SKILL.md` - 6a staging, `DOD_N` pattern

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/finalise-gaps-path.test.mjs` - gaps file has no accepted-path text
5. ✅ a new or extended 6a staging test beside `finalise-6a-registry-staging.test.mjs`

### Files to Modify (Generated)

6. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the three behaviours.

**Actions**:
- [x] `gaps` on a template leaves no `{CI_ROLLUP}`, `{CI_HEAD_1}` or "committed and pushed at 6a" text; `accepted` is unchanged. **Control**: a placeholder in a block the script does not own (a code span in a gap line) does not halt.
- [x] A work-item directory with a probe record and a `.d/` sidecar: after the 6a block, `git status --short` shows neither untracked.
- [x] A directory with `task.9.dod.1.x.md` and a foreign `task.9.dod.2.security.cases.1.json` allocates 3.
- [x] An `accepted` fill on a template whose CI reading line is still unfilled does not halt (or the CI line is filled before the call, shown by the same test). **Control**: a `gaps` fill with a surviving owned placeholder does halt.
- [x] 6a staging runs under bash **and** zsh (the existing 6a test's `SHELLS` loop): with no `security.*` artefact present the block does not abort (zsh `nomatch`), and with them present both the record and the `.d/` sidecar are staged.
- [x] Tests that read the template and must be updated or confirmed: `evals/shared/tests/finalise-bug-mode.test.mjs` (`:1390`) and `shared/resources/tests/finalise-gaps-path.test.mjs` (`:636`); the "committed and pushed at 6a" and `CI reading` literals found by `git grep -n 'committed and pushed at 6a\|CI reading' -- '*.test.*'` are listed in the QA report with their disposition.
- [x] Mutation proofs: revert each of the three edits; each turns exactly one named test red.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [x] A `gaps` fill leaves no accepted-path placeholder and a surviving placeholder halts, shown by the new tests (names in the QA report).
- [x] 6a leaves no `${STEM}.dod.${DOD_N}.security.*` path untracked, shown by a test that runs the block's staging slice.
- [x] `DOD_N` is 3 in the obs #96 scratch layout, shown by a test.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [x] Each of the three fixes has a mutation proof in the QA report.
- [x] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [x] `CI=true command node --test evals/shared/tests/finalise-bug-mode.test.mjs` passes.

### Migration

- [x] An existing accepted bug DoD fixture is unchanged by the fill.

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The placeholder halt fires on text that legitimately contains braces**
- **Risk**: false halts.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: restrict the check to the owned `## Verification Complete` block and the known placeholder names; the control test covers a brace in a code span.
- **Rollback**: revert the halt.

### Low Risk Areas

**1. A wider `DOD_N` pattern skips a number**
- **Risk**: gaps in numbering.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: highest + 1 is the existing rule; skipping is harmless.
- **Rollback**: revert the pattern.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a bug finalise run halts on a healthy DoD
- the finalise suites are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one fix misbehaves.

**Steps**:
1. Revert that phase's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: a message or pattern.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- finalise cannot complete a bug run that completed before

**Non-Critical (Forward Fix)**:
- wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-07
**Quality Score**: 97/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.270.qa.2.finalise-bookkeeping-is-mechanical.md](./task.270.qa.2.finalise-bookkeeping-is-mechanical.md)
- **Gate File**: [task.270.gate.2.finalise-bookkeeping-is-mechanical.yml](./task.270.gate.2.finalise-bookkeeping-is-mechanical.yml)

### Test Coverage Summary
- **Tests Executed**: 8013 (8011 pass, 0 fail, 2 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1's CHANGELOG finding is fixed. One low-confidence advisory item (template drift in the gaps rewrite) is already held by a committed test.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                         | Author      |
| ---------- | ------- | --------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #37, #59, #96 | create-task |
| 2026-11-07 | 1.1     | Review passed (8/10) — fixed drifted ADD_PATHS anchors, zsh-unsafe glob and unbound DOD_N in the 6a plan, and the accepted-path halt ordering; added tests for both | review-task |
| 2026-11-07 |         | Status → ready-for-development | review-task |
| 2026-11-07 |         | QA gate CONCERNS (90/100) — 1 finding (no CHANGELOG entry) | qa-task |
| 2026-11-07 |         | QA gate PASS (97/100) — 0 findings | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The fill script
- [x] Halt and gaps text (done in the script; the template is unchanged — the gaps rewrite lives in `fill-verification-complete.sh`)

### Phase 2: 6a staging
- [x] Security paths staged

### Phase 3: DOD_N namespace
- [x] Pattern widened

### Phase 4: Tests, bundle and sweep
- [x] Mutation proofs, bundle clean

---

## References

- Observation #37 — fill-verification-complete gaps fill leaves accepted-path placeholders in the Verification Complete block
- Observation #59 — finalise 6a does not stage the DoD security probe record and its .d/ sidecar
- Observation #96 — finalise DOD_N allocation ignores other writers' dod.N.* files, so a review-pr probe corpus shares its filename

---

## Notes

### Important Reminders

Task 269 and 271 also edit `skills/finalise/SKILL.md` at different steps.

### Future Improvements

None.

---

**Status:** Ready for Review
