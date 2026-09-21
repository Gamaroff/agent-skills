---
id: task.127
title: "[Task 127] Three parsers that accept what they should refuse: the registry's dependency cell doubles as free text, change-log.js duplicates a heading it should absorb, and quick_validate.py coerces a null description to the string 'None'"
type: task
description: "Three small, independent parser defects, each with a one-function fix and a fixture, bundled as one task because each is under two hours and they share nothing but the shape. select-next.mjs's parseDepCell reads the task-registry column that also carries prose notes, so 'PR #381 merged' and '3 QA cycles (80 → 95 → 90)' parse as phantom dependencies — inert today only because accepted rows are skipped. change-log.js upsertChangeLog, given a hand-authored ## Change Log heading above the start marker, rebuilds the block with its own heading inside and leaves the document with two. quick_validate.py wraps description in str() before every check, so a null, ~ or bare boolean validates as the 4-character string 'None'/'True' and passes with a 'very short' warning. Observations #74, #104, #107."
tags: [develop-next, change-log, create-skill, parsers]
category: refactoring
status: accepted
priority: Low
risk_level: low
created: 2026-09-17
updated: 2026-09-21
assignee:
estimated_effort_hours: 4
pr_number: 454
github_issue: 427
---

# Technical Task: Three parsers that accept what they should refuse

**Status:** Accepted
**GitHub Issue**: [#427](https://github.com/Gamaroff/agent-skills/issues/427)

---

## 1. Overview

Three readers, three inputs they misread, three fixes of a few lines each with a fixture that
reproduces the misreading. They are one task because each is independently trivial and none is
worth a pipeline run alone; they are listed as three phases so each is separately revertible.

**Scope**: `skills/develop-next/scripts/select-next.mjs` (`parseDepCell`) and the registry column contract;
`shared/resources/change-log.js` (`upsertChangeLog` heading absorption);
`skills/create-skill/scripts/quick_validate.py` (and its siblings) description type check.

## 2. Motivation

### Current Problems

1. **The dependency cell is the notes cell.** `docs/tasks/task-registry.md`'s last column carries
   `Obs #75 · PR #381 merged` style notes and is also what `parseDepCell` reads for `task.N` and bare
   numbers, so rows 100–106 parse dependencies on tasks 381, 3, 80, 95, 90 and 4. Inert only because
   accepted rows are skipped before dependency evaluation; task.113 closed the write side by refusing
   to annotate a non-accepted row, but a planned row with a note is one edit away (#74).
2. **Two `## Change Log` headings.** Task.120's log was hand-authored with the heading *above*
   `<!-- change-log-start -->` and the table inside. The first machine write rebuilt the marker span
   with its own heading, and the document now carries two consecutive headings. Nothing flagged it:
   the review passed 9/10 (#104).
3. **`description: ~` validates.** `quick_validate.py` does `str(fm['description'])` before every
   check, so a YAML null or a bare boolean becomes `'None'` / `'True'` and passes with a "very short"
   warning. Present since the initial import; surfaced by task.111's boundary probe (#107).

### Benefits

1. A dependency is only ever a `task.N` token; prose in the notes column can never become one, and
   the drift test asserts it over every row.
2. A hand-authored heading above the markers is absorbed on the first machine write; one heading, always.
3. A non-string description is rejected with a message naming the type, in every validator that reads it.

## 3. Technical Background

### Current Architecture

```
select-next.mjs parseDepCell(cell) → task ids from `task.N` AND bare numbers, over the notes column
change-log.js   upsertChangeLog     → findChangeLog locates the marker block; rebuild emits `## Change Log` inside it;
                                      a heading immediately above CL_START stays in `head`
quick_validate.py                   → description = ' '.join(str(fm['description']).split())
```

### Target Architecture

```
parseDepCell(cell) → `task\.(\d+)` tokens only, and only from the text before the first ` · ` separator
                     (notes follow the separator by convention, documented in the registry's own header)
task-registry-drift.test.mjs → for every row, deps ⊆ real task ids (non-vacuity: ≥ 1 row with a real dep)
upsertChangeLog    → when the block has no heading inside AND the nearest non-blank line above CL_START is
                     a Change Log heading (any level, optional numbering — same matcher as findChangeLog),
                     absorb it: drop from `head`, let the rebuild's heading replace it
quick_validate.py  → if not isinstance(desc, str) or not desc.strip(): fail "description must be a non-empty string (got <type>)"
                     same guard in skill_frontmatter.py / generate_catalog.py where str() is applied
```

### Important Clarifications

- **The registry column is not renamed** — that touches every writer (`create-task`, `registry-tick.js`)
  and the standard doc. The separator convention already exists in every note row; the parser is made
  to honour it, and the header comment in the registry states it.
- **Heading absorption is the same shape as `collapseOtherLegacyBlocks`**: a second representation of
  the same section that must converge to one. It applies only when the block has no heading inside
  and the line above is the heading — a heading two lines up with prose between stays where it is.
- **`str()` was hiding a type error, not normalising input.** The check is type-first, then the
  existing length rules run on a real string.

## 4. Scope

### In Scope

✅ `parseDepCell` separator rule + drift-test assertion; one sentence in the registry header.
✅ `upsertChangeLog` absorption + a fixture from task.120's committed shape; repair task.120's document.
✅ `quick_validate.py` type guard + `tests/skill-frontmatter.test.js` cases for `~`, `true`, `[]`; the
   same guard in the sibling scripts that `str()` the field.

### Out of Scope

❌ Renaming or splitting the registry column.
❌ Any other `change-log.js` behaviour.

## 5. Breaking Changes

None. A registry row whose *real* dependency was written after a ` · ` (none today — verify with the
drift test before merging) would need the dependency moved before the separator.

## 6. Implementation Plan

> Detailed implementation guide: [task.127.plan.three-parser-fixes.md](task.127.plan.three-parser-fixes.md)

### Phase 1: `parseDepCell` (#74)

**Risk Level**: Low

**Files**: `skills/develop-next/scripts/select-next.mjs`, `evals/shared/tests/task-registry-drift.test.mjs` and `evals/develop-next/unit/select-next.test.mjs`, `docs/tasks/task-registry.md` (header)

**Changes**:
- [ ] Parse `task.N` only, from the text before the first ` · `.
- [ ] Drift test: every row's parsed deps are real task ids; floor ≥ 1 real dep across the registry.
- [ ] Registry header: "dependencies before ` · `, notes after".

**Dependencies**: none.

### Phase 2: heading absorption (#104)

**Risk Level**: Low

**Files**: `shared/resources/change-log.js`, `shared/resources/tests/change-log.test.mjs`, `docs/tasks/task.120.*/task.120.*.md`

**Changes**:
- [ ] Absorb a heading immediately above `CL_START` when the block carries none.
- [ ] Fixture: task.120's shape → one heading after upsert; a heading with prose between → untouched.
- [ ] Repair task.120's document by running the fixed upsert (no hand edit).

**Dependencies**: none.

### Phase 3: description type (#107)

**Risk Level**: Low

**Files**: `skills/create-skill/scripts/quick_validate.py`, `skill_frontmatter.py`, `generate_catalog.py`, `tests/skill-frontmatter.test.js`

**Changes**:
- [ ] `isinstance(desc, str)` guard with a typed message; the null/boolean/list cases in the test.
- [ ] Same guard wherever a sibling script `str()`s the field (grep `str(fm['description'])`).

**Dependencies**: none.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/develop-next/scripts/select-next.mjs`
2. ✅ `shared/resources/change-log.js`
3. ✅ `skills/create-skill/scripts/quick_validate.py` (+ siblings)

### Files to Modify (Tests)

4. ✅ `evals/shared/tests/task-registry-drift.test.mjs` and `evals/develop-next/unit/select-next.test.mjs`
5. ✅ `shared/resources/tests/change-log.test.mjs`
6. ✅ `tests/skill-frontmatter.test.js`

### Files to Modify (Documentation)

7. ✅ `docs/tasks/task-registry.md` header; `docs/tasks/task.120.*/task.120.*.md` (repaired by the engine)
8. ✅ `skills/*/references/change-log.js` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] `parseDepCell("task.12, task.13 · PR #381 merged")` → `[12, 13]`; `("3 QA cycles (80 → 95)")` → `[]`.
- [ ] Absorption fixture; negative fixture.
- [ ] `description: ~` / `true` / `[]` → validation error naming the type.

**Command**: `npm test`

### Integration Tests
- [ ] Drift test green over the live registry; `select-next.mjs --dry-run` unchanged.
- [ ] task.120's document has one `## Change Log` after the engine run.

### Contract Tests
- [ ] `validate:all` green on every shipped skill (no shipped description is non-string).

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] `/develop-next --dry-run` output unchanged before and after.

## 9. Success Criteria

### Functional
- [ ] No registry row parses a phantom dependency; the test would fail if one did.
- [ ] One heading in task.120's document; the fixture reproduces the old defect on the old code.
- [ ] A null description fails validation.

### Performance
- [ ] None affected.

### Code Quality
- [ ] Three mutation proofs recorded (one per phase).

### Migration
- [ ] Observations #74, #104, #107 close naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
None.

### Low Risk
1. A real dependency written after ` · ` — the drift test's first run reveals it before merge.
2. A shipped skill with a non-string description — `validate:all` reveals it; fix the skill in the same PR.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: `select-next` misreads a real dependency; `validate:all` red on a skill that cannot be fixed in-PR.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: drift test and `validate:all` green on the reverted tree.

### Partial Rollback (1–2 hours)
- Phases are independent; revert one.

### Forward Fix
- Any of the three is a one-function change.

### Rollback Triggers
- **Critical**: a roadmap item becomes blocked on a phantom or dropped dependency.
- **Non-critical**: message wording.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #74, #104, #107) | create-task |
| 2026-09-21 |  | Implemented — 3 phases: parseDepCell kind-required + note separator (+drift test); change-log.js heading absorb (+test; 6 docs repaired); quick_validate.py typed description (+4 rows); 3 mutations proved | manual |
| 2026-09-21 | 1.1 | Accepted (PR #454) — the three parsers refuse what they should. Hand-driven quick win: no QA loop, no DoD file; the tests named here are the evidence | manual |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: parseDepCell
- [x] Phase 2: heading absorption
- [x] Phase 3: description type
- [ ] QA: `task.127.qa.[N].three-parser-fixes.md`
- [ ] Gate: `task.127.gate.[N].three-parser-fixes.yml`

## References

- Observations #74, #104, #107; task.113 (registry write-side guard); task.120 (the two-heading document)
- `docs/standards/task-registry.md`; `shared/resources/document-change-log.md`

## Notes

- **Accepted 2026-09-21 without the pipeline (PR #454).** Selector side effect: with phantom deps gone, `/develop-next` selects T136 (High) ahead of T126. Task.132's doubled heading is repaired by the engine's absorb on its next write or by hand after PR #453 merges.
Bugs found during QA land at `task.127.bug.[N].[name].md` in this directory.
