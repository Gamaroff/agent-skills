---
id: task.247
title: "Wireframe mapping pipeline test scope to skill-local step docs"
type: task
description: "Close carried advisory finding TASK-246-CR5-1 from task.246: widen develop pipeline ban test to skill-local step docs and amend task.246 criterion (TASK-246-CR4-1 retired as byte no-op)."
tags: [wireframe-map, testing, hooks, eval]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-30
updated: 2026-10-30
assignee:
estimated_effort_hours: 1
github_issue: 794
---

# Technical Task: Wireframe Mapping Pipeline Test Scope to Skill-Local Step Docs

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.247.review.1.wireframe-mapping-follow-ups.md` implemented 2026-10-30
**GitHub Issue**: [#794](https://github.com/Gamaroff/agent-skills/issues/794)

---

## 1. Overview

This task resolves the carried advisory finding **TASK-246-CR5-1** out of task.246 (Wireframe mapping setup offer and first-run candidates, PR #793, accepted):

1. **TASK-246-CR5-1** (advisory, medium/medium; test-only): The test "no develop pipeline step calls detect or configure" in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` (~lines 127–166) reads `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md`, but omits skill-local step documents under `skills/develop-*/references/` (such as `skills/develop-bug/references/develop-bug-step-*.md`). While no call exists today, an accidental `detect` or `configure` call added to a skill-local step doc would pass unnoticed. The test must be widened to include skill-local step docs while excluding auto-generated bundled copies, and the original criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 must be amended to match.

> **Resolution of TASK-246-CR4-1**: A second finding, TASK-246-CR4-1 (blank line preservation in `wireframe-map.js configure` list-removal under blank keys on unterminated files), was evaluated in detail during task review. Mathematical and empirical analysis proved that stripping `\r?\n$` from the trailing blank line piece vs the last non-blank piece yields byte-identical output across all possible inputs (`A + "\n" + ""` === `A + "" + "\n"` === `A + "\n"`). The proposed test case already passes on the unfixed codebase and cannot be mutation-proven. Per review decision, CR4-1 is retired as a non-defect with no engine changes required.

**Scope**: Test widening across one eval test file and one historical task document criterion amendment, verified by mutation proof.

---

## 2. Motivation

### Current Problems

1. **Blind spot in develop pipeline prohibition test (TASK-246-CR5-1)**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs` ensures develop pipeline steps never invoke `wireframe-map.js detect` or `configure`. However, it only inspects `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md`. `skills/develop-bug` has five skill-local step documents in `skills/develop-bug/references/` (e.g. `develop-bug-step-0-resolve-bug.md`). If a future commit adds a prohibited call to one of these files, the test remains green.
2. **Unresolved carried findings**: Identified during QA gate 5 (`recommendations.future`) of task.246 and carried forward to keep the original task focused.

### Benefits

1. **Complete coverage of develop pipeline step documentation**: All develop pipeline execution paths—both shared resources and skill-local reference files—are guarded against calling setup or configure.
2. **No carried debt**: Closes the outstanding actionable advisory finding from task.246.

---

## 3. Technical Background

### Current Architecture

In `evals/shared/tests/wireframe-mapping-hooks.test.mjs` (lines 127–154):
```javascript
test("no develop pipeline step calls detect or configure", () => {
  const developSkills = readdirSync(join(ROOT, "skills"))
    .filter(
      (s) =>
        /^develop-/.test(s) && existsSync(join(ROOT, "skills", s, "SKILL.md")),
    )
    .sort();
  // ...
  const files = [
    ...developSkills.map((s) => [
      `skills/${s}/SKILL.md`,
      read(`skills/${s}/SKILL.md`),
    ]),
    ...readdirSync(join(ROOT, "shared/resources"))
      .filter((f) => /^develop-pipeline-.*\.md$/.test(f))
      .map((f) => [`shared/resources/${f}`, read(`shared/resources/${f}`)]),
  ];
  // ...
});
```
This inspects `SKILL.md` and `shared/resources/develop-pipeline-*.md`, but none of the skill-local step docs under `skills/develop-*/references/`.

### Target Architecture

In `evals/shared/tests/wireframe-mapping-hooks.test.mjs`:
Enumerate `skills/develop-*/references/*.md`, filtering for files that:
- match step document conventions (e.g. `develop-*-step-*.md`), AND
- are NOT auto-generated bundled copies (i.e. do not contain `<!-- AUTO-GENERATED`).

Include these files in `developSetupCalls` validation and assert skill-local step docs were found.

### Important Clarifications

- **TASK-246-CR4-1 is retired**: Rigorous trace showed that stripping `\n` from the last blank line piece vs stripping from the preceding content piece results in identical output bytes. The behavior observed by QA was string-concatenation equivalence, not byte corruption.
- **Map path containment is out of scope**: A third finding from task.246 gate 4/5 noted that configured map and catalogue paths are not verified for repository containment. That issue is pre-existing and requires an architectural decision regarding repository boundaries; it is explicitly excluded from this task.

---

## 4. Scope

### In Scope

✅ **TASK-246-CR5-1**: Widen develop pipeline ban test in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` to include skill-local step documents (excluding auto-generated bundled copies).
✅ **Task 246 § 9 criterion amendment**: Update the criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 to cite skill-local step docs.
✅ **Mutation proof**: Verify the test goes red when a prohibited call is injected into a skill-local step doc and returns to green when removed.
✅ **Changelog**: Document the test coverage extension under `[Unreleased]`.

### Out of Scope

❌ **TASK-246-CR4-1 engine change**: Proven to be a byte no-op; no engine modification needed.
❌ **Map-path containment**: Restricting configured map and catalogue paths to the repository root is pre-existing and requires separate design decisions.
❌ **Any UI or wireframe modifications**: No screens, visual assets, or wireframe definitions are modified.

---

## 5. Breaking Changes

None - test-only and documentation updates. No public APIs, CLI flags, or engine behaviors are changed.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.247.plan.wireframe-mapping-follow-ups.md](task.247.plan.wireframe-mapping-follow-ups.md)

### Phase 1: Widen Develop Pipeline Ban Test and Amend Criterion (CR5-1)

**Risk Level**: Low

**Files**:
- `evals/shared/tests/wireframe-mapping-hooks.test.mjs`
- `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md`

**Changes**:
- [ ] In `wireframe-mapping-hooks.test.mjs`, expand the file list in "no develop pipeline step calls detect or configure" to discover skill-local step docs under `skills/develop-*/references/*.md` that do not contain `<!-- AUTO-GENERATED`.
- [ ] Assert that skill-local step docs (such as `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`) are found and scanned.
- [ ] Amend the criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 to name skill-local step docs alongside `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md`.
- [ ] Mutation proof: Temporarily insert a `wireframe-map.js detect` call into `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, verify the test fails naming the file and line, and revert.

**Dependencies**: None

---

### Phase 2: Verification and Changelog

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`

**Changes**:
- [ ] Update `CHANGELOG.md` under `[Unreleased]` documenting the test widening.
- [ ] Run `npx prettier --check` on touched files.
- [ ] Run `npm run ci:fast` and verify all tests pass.

**Dependencies**: Depends on Phase 1

---

## 7. Files Summary

### Files to Modify (Tests & Implementation)

1. ✅ `evals/shared/tests/wireframe-mapping-hooks.test.mjs` - Widen develop pipeline ban test to include skill-local step documents.

### Files to Modify (Documentation & Historical Record)

2. ✅ `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` - Amend success criterion in § 9.
3. ✅ `CHANGELOG.md` - Record test widening under `[Unreleased]`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Integration / Eval Tests

**Scope**: Validate develop pipeline hooks scan.

**Command**: `command node --test evals/shared/tests/wireframe-mapping-hooks.test.mjs`

**Cases**:
- [ ] Scan finds skill-local step docs (at least 5 `develop-bug-step-*.md` files) and asserts no `wireframe-map.js detect|configure` calls exist.
- [ ] Auto-generated bundled copies are ignored.

### Mutation Proofs

- [ ] Add `wireframe-map.js detect` to `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` -> verify `wireframe-mapping-hooks.test.mjs` fails; revert.

### Contract & Hygiene Tests

- [ ] `npx prettier --check` clean on all touched files.
- [ ] `npm run ci:fast` passes cleanly.

---

## 9. Success Criteria

### Functional

- [x] Test "no develop pipeline step calls detect or configure" in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` covers skill-local step docs under `skills/develop-*/references/` that lack the `<!-- AUTO-GENERATED` banner.
- [x] The success criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 is updated to name skill-local step docs.

### Code Quality

- [x] Fix is verified with mutation proof (seeing the test turn red upon fault injection and green upon restore).
- [x] `npm run ci:fast` passes with 0 failures.
- [x] Prettier formatting is verified on all modified files.

### Migration

- [x] `CHANGELOG.md` under `[Unreleased]` documents the widened test coverage.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Test glob over-matches bundled copies**
   - **Risk**: Scanning `skills/develop-*/references/*.md` without properly excluding `<!-- AUTO-GENERATED` files could inspect duplicate copies or cause churn if bundled links change.
   - **Probability**: Low.
   - **Impact**: Medium (false test failures).
   - **Mitigation**: Filter explicitly for absence of `<!-- AUTO-GENERATED` header.
   - **Rollback**: Revert test file change.

### Low Risk Areas

None.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `npm run ci:fast` or `npm test` fails unexpectedly on develop.

**Steps**:
1. Revert merge commit on `develop`: `git revert -m 1 <commit-hash>`.
2. Verify test suites pass.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-30 | 1.0     | Initial draft | create-task |
| 2026-10-30 | 1.1     | Review passed (9/10) — scoped to test widening (CR5-1); CR4-1 retired as byte no-op | review-task |
| 2026-10-30 |         | Status → ready-for-development | review-task |
| 2026-10-30 |         | Status → ready-for-review | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Widen Develop Pipeline Ban Test and Amend Criterion (CR5-1)
- [x] Widen `wireframe-mapping-hooks.test.mjs` to skill-local step docs
- [x] Amend task.246 § 9 criterion
- [x] Mutation proof for test widening

### Phase 2: Verification and Changelog
- [x] Update `CHANGELOG.md`
- [x] Run `npm run ci:fast`

---

## References

- **Predecessor Task**: [task.246](../task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md)
- **Gate 4 Report**: [task.246.gate.4.wireframe-mapping-setup-offer.yml](../task.246.wireframe-mapping-setup-offer/task.246.gate.4.wireframe-mapping-setup-offer.yml) (TASK-246-CR4-1)
- **Gate 5 Report**: [task.246.gate.5.wireframe-mapping-setup-offer.yml](../task.246.wireframe-mapping-setup-offer/task.246.gate.5.wireframe-mapping-setup-offer.yml) (TASK-246-CR5-1)
- **Hooks Eval**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs`

---

## Notes

### Important Reminders

- Use `command node`, not bare `node`.
- Filter for `!content.includes("<!-- AUTO-GENERATED")` to ensure only author-owned skill-local step docs are scanned.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Map-path containment (configured map/catalogue path outside repository root) remains pre-existing and deferred to a dedicated task.

---

**Status:** Ready for Review
