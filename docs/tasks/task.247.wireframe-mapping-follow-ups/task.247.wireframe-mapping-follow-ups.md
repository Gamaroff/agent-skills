---
id: task.247
title: "Wireframe mapping pipeline test scope and configure blank lines"
type: task
description: "Close carried advisory findings from task.246: widen develop pipeline ban test to skill-local step docs and preserve blank lines in configure blank-key list removal."
tags: [wireframe-map, testing, configure, yaml]
category: refactoring
status: planned
priority: Medium
created: 2026-10-30
updated: 2026-10-30
assignee:
estimated_effort_hours: 2
github_issue: 794
---

# Technical Task: Wireframe Mapping Pipeline Test Scope and Configure Blank Lines

**Status:** Planned
**GitHub Issue**: [#794](https://github.com/Gamaroff/agent-skills/issues/794)

---

## 1. Overview

This task resolves two small, independent advisory findings carried out of task.246 (Wireframe mapping setup offer and first-run candidates, PR #793, accepted):

1. **TASK-246-CR5-1** (advisory, medium/medium; test-only): The test "no develop pipeline step calls detect or configure" in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` (~lines 127–166) reads `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md`, but omits skill-local step documents under `skills/develop-*/references/` (such as `skills/develop-bug/references/develop-bug-step-*.md`). While no call exists today, an accidental `detect` or `configure` call added to a skill-local step doc would pass unnoticed. The test must be widened to include skill-local step docs while excluding auto-generated bundled copies, and the original criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 must be amended to match.
2. **TASK-246-CR4-1** (LOW; engine bug): In `shared/resources/wireframe-map.js`, `configure` removes a list under a blank key. When the removed list is the last thing in the file, has no trailing newline, and holds an internal blank line, line 1457 strips the newline from the last retained piece (`pieces[pieces.length - 1]`), which is the blank line. As a result, the blank line is deleted and the file gains a trailing newline. The fix strips from the last non-blank retained piece instead, preserving all retained bytes.

**Scope**: Two independent fixes across one test file and one engine file, with corresponding unit tests and mutation proofs.

---

## 2. Motivation

### Current Problems

1. **Blind spot in develop pipeline prohibition test (TASK-246-CR5-1)**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs` ensures develop pipeline steps never invoke `wireframe-map.js detect` or `configure`. However, it only inspects `skills/develop-*/SKILL.md` and `shared/resources/develop-pipeline-*.md`. `skills/develop-bug` has five skill-local step documents in `skills/develop-bug/references/` (e.g. `develop-bug-step-0-resolve-bug.md`). If a future commit adds a prohibited call to one of these files, the test remains green.
2. **YAML byte corruption on blank key list removal (TASK-246-CR4-1)**: When `configure` replaces a blank key with its configured value and drops an existing list under it, internal blank lines within that list are preserved (as `!pieces[n].trim()` is skipped from the drop list). But if the file was unterminated (no trailing newline), `unterminated` handling strips `\r?\n$` from `pieces[pieces.length - 1]`. If an internal blank line followed the last content item or was the last retained line, its newline is stripped, deleting the blank line and adding an unwanted newline to the file.
3. **Unresolved carried findings**: Both issues were identified during QA review cycles in task.246 (gate 4 and gate 5 `recommendations.future`) and carried forward to keep the original task focused.

### Benefits

1. **Complete coverage of develop pipeline step documentation**: All develop pipeline execution paths—both shared resources and skill-local reference files—are guarded against calling setup or configure.
2. **Strict byte fidelity**: `wireframe-map.js configure` reliably preserves exact file formatting, internal blank lines, and line endings even on unterminated edge cases.
3. **No carried debt**: Closes the outstanding advisory findings from task.246.

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

In `shared/resources/wireframe-map.js` (lines 1443–1461):
```javascript
      const drop = [];
      for (let n = j + 1; n < pieces.length; n++) {
        if (!pieces[n].trim() || /^\s*#/.test(pieces[n])) continue;
        if (!under.test(pieces[n])) break;
        drop.push(n);
      }
      // A file that ended without a newline still does when its last line goes.
      const unterminated =
        drop.includes(pieces.length - 1) &&
        !pieces[pieces.length - 1].endsWith("\n");
      const tail = /\r?\n$/.exec(pieces[j]);
      pieces[j] = yamlLines(k, v, indent).join(eol) + (tail ? tail[0] : "");
      for (const n of drop.reverse()) pieces.splice(n, 1);
      if (unterminated)
        pieces[pieces.length - 1] = pieces[pieces.length - 1].replace(
          /\r?\n$/,
          "",
        );
```
If `drop` included the file's last line (which was unterminated), but preceding lines in the list included blank lines, `pieces[pieces.length - 1]` after splicing may be a blank line (`\n`). Stripping its newline turns it into `""`, which drops the blank line and leaves the prior line terminated.

### Target Architecture

1. In `evals/shared/tests/wireframe-mapping-hooks.test.mjs`:
   Enumerate `skills/develop-*/references/*.md`, filtering for files that:
   - match step document conventions (e.g. `develop-*-step-*.md`), AND
   - are NOT auto-generated bundled copies (i.e. do not contain `<!-- AUTO-GENERATED`).
   Include these files in `developSetupCalls` validation.
2. In `shared/resources/wireframe-map.js`:
   When `unterminated` is true, locate the last retained non-blank piece in `pieces` and strip its trailing newline, rather than blindly modifying `pieces[pieces.length - 1]`.

### Important Clarifications

- **Map path containment is out of scope**: A third finding from task.246 gate 4/5 noted that configured map and catalogue paths are not verified for repository containment. That issue is pre-existing and requires an architectural decision regarding repository boundaries; it is explicitly excluded from this task.

---

## 4. Scope

### In Scope

✅ **TASK-246-CR5-1**: Widen develop pipeline ban test in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` to include skill-local step documents (excluding auto-generated bundled copies).
✅ **Task 246 § 9 criterion amendment**: Update the criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 to cite skill-local step docs.
✅ **TASK-246-CR4-1**: Fix `wireframe-map.js` `configure` list-removal on blank keys to strip trailing newline from the last non-blank retained piece when the file was unterminated.
✅ **Unit testing**: Add a test case for unterminated blank-key lists containing blank lines in `shared/resources/tests/wireframe-map.test.mjs` next to existing `lastLines` cases (~line 1415).
✅ **Mutation proofs**: Verify both tests go red when defects are introduced and return to green when fixed.
✅ **Resource bundling**: Run `npm run bundle` to propagate changes to `references/wireframe-map.js` in all skills.

### Out of Scope

❌ **Map-path containment**: Restricting configured map and catalogue paths to the repository root is pre-existing and requires separate design decisions.
❌ **Any UI or wireframe modifications**: No screens, visual assets, or wireframe definitions are modified.

---

## 5. Breaking Changes

None - API remains stable. Both fixes correct edge-case internal behavior and broaden test coverage without changing public interfaces.

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

### Phase 2: Fix Configure Blank-Key Blank-Line Preservation (CR4-1)

**Risk Level**: Low

**Files**:
- `shared/resources/wireframe-map.js`
- `shared/resources/tests/wireframe-map.test.mjs`

**Changes**:
- [ ] In `shared/resources/wireframe-map.js`, update the `unterminated` handling in `configure`'s blank-key list removal loop: scan backward for the last non-blank retained piece and strip its trailing newline.
- [ ] In `shared/resources/tests/wireframe-map.test.mjs`, add a test case in `lastLines` covering an unterminated file where a blank key's list contains an internal blank line, asserting exact byte equality with the expected output (retaining the blank line and ending without a newline).
- [ ] Mutation proof: Revert the engine fix to verify the new test fails, then restore.

**Dependencies**: None (independent of Phase 1)

---

### Phase 3: Bundle and Verification

**Risk Level**: Low

**Files**:
- `skills/*/references/wireframe-map.js` (bundled copies)
- `CHANGELOG.md`

**Changes**:
- [ ] Run `npm run bundle` to refresh bundled `wireframe-map.js` copies across all skills.
- [ ] Run `npm run bundle:check` to confirm all bundled copies match their sources.
- [ ] Update `CHANGELOG.md` under `[Unreleased]` documenting the fixes.
- [ ] Run `npm run ci:fast` and verify all tests pass.

**Dependencies**: Depends on Phase 2

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/wireframe-map.js` - Fix newline stripping on unterminated blank-key list removals to target the last non-blank piece.

### Files to Modify (Tests)

2. ✅ `evals/shared/tests/wireframe-mapping-hooks.test.mjs` - Widen develop pipeline ban test to include skill-local step documents.
3. ✅ `shared/resources/tests/wireframe-map.test.mjs` - Add test case for unterminated blank-key lists with internal blank lines.

### Files to Modify (Documentation & Historical Record)

4. ✅ `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` - Amend success criterion in § 9.
5. ✅ `CHANGELOG.md` - Record the fixes under `[Unreleased]`.

### Generated Files (via `npm run bundle`)

6. ✅ `skills/create-story/references/wireframe-map.js`
7. ✅ `skills/create-task/references/wireframe-map.js`
8. ✅ `skills/develop-story/references/wireframe-map.js`
9. ✅ `skills/develop-task/references/wireframe-map.js`
10. ✅ `skills/qa-story/references/wireframe-map.js`
11. ✅ `skills/qa-task/references/wireframe-map.js`
12. ✅ `skills/review-story/references/wireframe-map.js`
13. ✅ `skills/review-task/references/wireframe-map.js`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: Validate `configure` blank-key list removal under unterminated conditions.

**Command**: `command node --test shared/resources/tests/wireframe-map.test.mjs`

**Cases**:
- [ ] Unterminated file with a blank key holding a list with an internal blank line: `ui:\n  componentBarrel: b.ts\n  wireframeMap:\n    - m.md\n\n    - n.md` (no trailing newline) -> configures to `ui:\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n\n`... without deleting the blank line or adding an unwanted newline.

### Integration / Eval Tests

**Scope**: Validate develop pipeline hooks scan.

**Command**: `command node --test evals/shared/tests/wireframe-mapping-hooks.test.mjs`

**Cases**:
- [ ] Scan finds skill-local step docs (at least 5 `develop-bug-step-*.md` files) and asserts no `wireframe-map.js detect|configure` calls exist.
- [ ] Auto-generated bundled copies are ignored.

### Mutation Proofs

- [ ] Add `wireframe-map.js detect` to `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` -> verify `wireframe-mapping-hooks.test.mjs` fails; revert.
- [ ] Revert the last non-blank piece newline strip fix in `shared/resources/wireframe-map.js` -> verify `wireframe-map.test.mjs` fails; restore.

### Contract & Hygiene Tests

- [ ] `npm run bundle:check` exits 0 with 0 problems.
- [ ] `npx prettier --check` clean on all touched files.
- [ ] `npm run ci:fast` passes cleanly.

---

## 9. Success Criteria

### Functional

- [ ] Test "no develop pipeline step calls detect or configure" in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` covers skill-local step docs under `skills/develop-*/references/` that lack the `<!-- AUTO-GENERATED` banner.
- [ ] `shared/resources/wireframe-map.js` `configure` strips the trailing newline from the last non-blank retained piece when an unterminated list under a blank key is removed, preserving any kept blank lines and leaving the file unterminated.
- [ ] The success criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9 is updated to name skill-local step docs.

### Code Quality

- [ ] Both fixes are verified with mutation proofs (seeing the relevant test turn red upon fault injection and green upon restore).
- [ ] `npm run ci:fast` passes with 0 failures.
- [ ] `npm run bundle:check` reports 0 problems across all skills.
- [ ] Prettier formatting is verified on all modified files.

### Migration

- [ ] `CHANGELOG.md` under `[Unreleased]` documents the byte-preservation fix and the widened test coverage.

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

1. **Newline stripping logic alters unintended lines**
   - **Risk**: Stripping the last non-blank piece might alter files that were properly terminated.
   - **Mitigation**: Guard strictly behind the existing `unterminated` condition (`drop.includes(pieces.length - 1) && !pieces[pieces.length - 1].endsWith("\n")`).
   - **Rollback**: Revert `shared/resources/wireframe-map.js`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `npm run ci:fast` or `npm test` fails unexpectedly on develop.
- Consumer reports corrupted `skills-config.yaml` formatting.

**Steps**:
1. Revert merge commit on `develop`: `git revert -m 1 <commit-hash>`.
2. Run `npm run bundle` to refresh bundled files.
3. Verify test suites pass.

---

### Partial Rollback (1-2 hours)

**When to Use**: If Phase 2 (engine fix) needs rework while Phase 1 (test widening) is sound.

**Steps**:
1. Revert `shared/resources/wireframe-map.js` and `shared/resources/tests/wireframe-map.test.mjs`.
2. Re-run `npm run bundle` and commit.

---

### Forward Fix (< 4 hours)

**When to Use**: Minor edge-case in glob matching or test assertion.

**Approach**: Adjust the filter predicate in `evals/shared/tests/wireframe-mapping-hooks.test.mjs`.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-30 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Widen Develop Pipeline Ban Test and Amend Criterion (CR5-1)
- [ ] Widen `wireframe-mapping-hooks.test.mjs` to skill-local step docs
- [ ] Amend task.246 § 9 criterion
- [ ] Mutation proof for test widening

### Phase 2: Fix Configure Blank-Key Blank-Line Preservation (CR4-1)
- [ ] Update `wireframe-map.js` unterminated newline strip
- [ ] Add unit test in `wireframe-map.test.mjs`
- [ ] Mutation proof for configure fix

### Phase 3: Bundle and Verification
- [ ] Run `npm run bundle`
- [ ] Verify `npm run bundle:check`
- [ ] Update `CHANGELOG.md`
- [ ] Run `npm run ci:fast`

---

## References

- **Predecessor Task**: [task.246](../task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md)
- **Gate 4 Report**: [task.246.gate.4.wireframe-mapping-setup-offer.yml](../task.246.wireframe-mapping-setup-offer/task.246.gate.4.wireframe-mapping-setup-offer.yml) (TASK-246-CR4-1)
- **Gate 5 Report**: [task.246.gate.5.wireframe-mapping-setup-offer.yml](../task.246.wireframe-mapping-setup-offer/task.246.gate.5.wireframe-mapping-setup-offer.yml) (TASK-246-CR5-1)
- **Engine**: `shared/resources/wireframe-map.js`
- **Hooks Eval**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs`

---

## Notes

### Important Reminders

- Never edit `skills/*/references/wireframe-map.js` by hand; always edit `shared/resources/wireframe-map.js` and run `npm run bundle`.
- Use `command node`, not bare `node`.
- Keep Phase 1 and Phase 2 independent and separately verifiable.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Map-path containment (configured map/catalogue path outside repository root) remains pre-existing and deferred to a dedicated task.

---

**Status:** Planned

**Next Steps**:
1. Implement according to implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.247.qa.1.wireframe-mapping-follow-ups.md`
   - Quality Gate: `task.247.gate.1.wireframe-mapping-follow-ups.yml`
