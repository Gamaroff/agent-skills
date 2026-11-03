---
id: task.253
title: "migrate-doc-numbering: link, frontmatter and downstream safety nets"
type: task
description: "Close the remaining tinker-city handoff gaps in migrate-doc-numbering.mjs: multi-line links, a post-apply dead-link and old-path scan, frontmatter validation, a link-free registry stub, a dirty/behind guard, generated files, and a legacy-name warning for consumer scripts."
tags: [migrate-doc-numbering, links, safety-nets]
category: refactoring
status: planned
priority: Medium
created: 2026-11-03
updated: 2026-11-03
estimated_effort_hours: 16
---

# migrate-doc-numbering: link, frontmatter and downstream safety nets

**Status:** Planned

---

## 1. Overview

Six smaller gaps from the tinker-city handoff (gaps 2 to 7), each making the migration tool report or handle something it now passes over. Only gap 2 (multi-line links) was reproduced before this task was cut. The others come from the handoff's notes, and Phase 1 reproduces each one before any fix is written.

**Scope**: `shared/resources/migrate-doc-numbering.mjs` and its tests. The multi-line link part may touch `shared/resources/doc-links.js`, which other tools share.

---

## 2. Motivation

### Current Problems

1. **Multi-line links are not re-pointed (reproduced 2026-11-03).** A link written `[multi` / `line](../../epic.1.alpha.md)` was left as written after `--apply` and now points at a path that no longer exists.
2. **Dead links are only found by hand (handoff).** Links in fenced examples and inline code that meant a real path were left dangling.
3. **Frontmatter completeness (handoff, not reproduced).** `prd_number` was missing on sub-stories `4.1.1A` and `4.1.1B`.
4. **The retired registry stub carries a dead link (handoff, not reproduced).**
5. **A dirty tree or a branch behind upstream gives a wrong plan (handoff, not reproduced).** A dry run made before a pull reported the wrong next PRD number.
6. **A generated, committed report was edited (handoff, not reproduced):** `graphify-out/GRAPH_REPORT.md` in the consumer.
7. **Nothing warns about consumer scripts that hard-code legacy names (handoff).** tinker-city's `lint-docs` counted 0 stories and 0 epics after the migration while CI stayed green.

### Benefits

1. The tool prints what it left dangling instead of the author finding it later.
2. A migrated story is checked against the shape the pipeline reads.
3. A stale plan is refused or warned about, not applied.
4. The closing warning would have caught tinker-city's bug.118 at migration time.

---

## 3. Technical Background

### Current Architecture

- Link extraction goes through `extractRelativeLinks` in `shared/resources/doc-links.js:204`, which calls `scanLinks` (`:175`) over the text with fences and code spans blanked. Reproduced behaviour: a link whose text spans a newline is not matched, so it is neither counted nor re-pointed. (Whether the cause is the inline-link regex or the paragraph handling is for Phase 2 to establish.)
- The rewrite pass reads those links at `shared/resources/migrate-doc-numbering.mjs:999` and edits through `planEdits` (`:1172`).
- `prd_number` is written at `:1223`, `:1238` and `:1256`. Which document shapes reach each site is unverified.
- The registry stub is built near `:1650-1690` (`MIGRATED_EPICS_HEADING`, `status: retired`, `# Epic Registry (retired)`).
- A `dirty-path` blocker exists (`:95`, `:1516`) for paths the run would change. Nothing checks the whole tree or the upstream. `(unverified)` whether `--check` and the dry run ask at all.
- No code excludes generated files, and no code scans for legacy-name consumers. `grep -n "graphify" shared/resources/migrate-doc-numbering.mjs` finds nothing.

### Target Architecture

- Multi-line links are matched and re-pointed.
- After `--apply`, a scan over the rewritten files prints every relative link whose target does not exist (fenced ones as warnings), and every old path from the move map still present anywhere in the tracked tree.
- A story's frontmatter is validated after rewriting against what `doc-id.js` and the story template require.
- The registry stub is generated without links.
- A dirty tree or a branch behind upstream stops the run, or warns, in all modes.
- Generated files are skipped and listed as `skipped, generated`.
- A closing line lists tracked files that still match the legacy patterns outside the PRD root.

### Important Clarifications

- The legacy-pattern warning uses the grammar through `doc-id.js` where it can. A regex for the old names would trip `tests/doc-id-chokepoint.test.js`; use its allowlist with a reason only if no other way exists.
- Re-vendoring into tinker-city is not part of this task.

---

## 4. Scope

### In Scope

✅ The seven items above, each behind a failing test written first.
✅ Docs that describe the tool's output.

### Out of Scope

❌ Fixing consumers' scripts.
❌ Unclassifiable names (task 252).
❌ Re-vendoring into tinker-city.

---

## 5. Breaking Changes

None to the CLI's inputs. Outputs gain lines and the tool may refuse a dirty or behind tree, which changes an exit code for such a run. The refusal is a **warning in the dry run and `--check`, and a blocker for `--apply`**, so read-only use keeps working. Migration path: commit or pull first.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.253.plan.migrate-doc-numbering-safety-nets.md](task.253.plan.migrate-doc-numbering-safety-nets.md)

### Phase 1: Reproduce each gap, tests first

**Risk Level**: Low

**Files**: `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Changes**:
- [ ] One failing test per gap, using the real-git-repo helper. Where a gap does not reproduce, record that in the QA report and drop it from scope, rather than fix a guess.

**Dependencies**: none.

---

### Phase 2: Multi-line links

**Risk Level**: High (shared module)

**Files**: `shared/resources/doc-links.js`, `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [ ] Find the cause. Fix it in `doc-links.js` only if every other caller of `extractRelativeLinks` is correct to gain multi-line matches. List the callers with `grep -rn "extractRelativeLinks" shared skills scripts`.
- [ ] Otherwise normalise inside the migration tool's own pass.

**Dependencies**: Phase 1.

---

### Phase 3: Post-apply scan and legacy-name warning

**Risk Level**: Medium

**Files**: `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [ ] Dead-link scan over rewritten files; fenced and inline-code links as warnings.
- [ ] Old-path scan across tracked files using the move map.
- [ ] Closing line `N repo files still hard-code legacy names: …`.

**Dependencies**: Phase 1.

---

### Phase 4: Frontmatter, stub, dirty/behind, generated files

**Risk Level**: Medium

**Files**: `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [ ] Validate migrated story frontmatter (reproduce first).
- [ ] Generate the registry stub without links.
- [ ] Dirty-tree and behind-upstream check.
- [ ] Skip generated files and list them.

**Dependencies**: Phase 1.

---

### Phase 5: Mutation proof and docs

**Risk Level**: Low

**Changes**:
- [ ] Revert each fix in turn and confirm its test goes red.
- [ ] Update docs that describe the tool's output; `npm run bundle`; `CHANGELOG.md`.

**Dependencies**: Phases 2 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/migrate-doc-numbering.mjs`
2. ✅ `shared/resources/doc-links.js` — only if Phase 2 decides so.

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs`
4. ✅ A `doc-links` test, if `doc-links.js` changes.

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`, and docs describing the tool's output (`grep -rln "migrate-doc-numbering" docs`).

Generated copies under `skills/*/references/` change through `npm run bundle`.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: link extraction and each new report, over `memIo`.

**Actions**:
- [ ] Multi-line link matched and re-pointed.
- [ ] Dead link in a fence reported as a warning, not rewritten.
- [ ] Legacy-name file reported; a file with no legacy name not reported.

**Command**: `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`

### Integration Tests

**Scope**: a real temporary git repo.

**Actions**:
- [ ] Dirty tree: dry run warns, `--apply` refuses.
- [ ] Behind upstream: same, using a second clone as the upstream.
- [ ] Generated file untouched and listed.

### Control case

For the dead-link scan, include a live link and a link to an external URL that must not be reported.

---

## 9. Success Criteria

### Functional

- [ ] On the fixture, the multi-line link resolves after `--apply`.
- [ ] A dangling link left by the tool is printed with file and line.
- [ ] The stub contains no link.
- [ ] `--apply` refuses a dirty tree and a branch behind upstream.
- [ ] A generated file is not edited.
- [ ] A tracked script containing a legacy pattern is listed in the closing line.

### Performance

- [ ] The post-apply scans read each tracked file once; the test's read counter is asserted.

### Code Quality

- [ ] Tests, `npm test`, `npm run bundle:check` pass.
- [ ] Each fix's test goes red when the fix is reverted (QA report).

### Migration

- [ ] `CHANGELOG.md` updated.
- [ ] Gaps that did not reproduce are recorded as such in the QA report.

---

## 10. Risk Assessment

### High Risk Areas

**1. Changing `doc-links.js`**
- **Risk**: other tools gain or lose link matches.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: list callers first (Phase 2); keep the change local to the migration tool if any caller depends on single-line matching.
- **Rollback**: revert the commit.

### Medium Risk Areas

**1. Dirty/behind check blocks legitimate use**
- **Risk**: the check needs an upstream; a repo with none would fail.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: no upstream means skip the behind check and say so.
- **Rollback**: forward fix.

**2. Legacy-name scan noise**
- **Risk**: many false hits.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: warning only; exits 0.
- **Rollback**: forward fix.

### Low Risk Areas

**1. Output wording**
- **Risk**: unclear lines.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: assert the text in tests.
- **Rollback**: none needed.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- Another tool's link results change after Phase 2.

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle`.

**Verification**: `npm test` passes.

---

### Partial Rollback (1-2 hours)

**When to Use**: one item misbehaves.

**Steps**:
1. Revert that phase's commit only. Each phase is its own commit.

---

### Forward Fix (< 4 hours)

**When to Use**: output wording or scan noise.

**Approach**: adjust and add a test line.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A migration that worked before now fails or rewrites a wrong link.

**Non-Critical (Forward Fix)**:
- Noisy warnings.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-03 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: reproduce, tests first
- [ ] Phase 2: multi-line links
- [ ] Phase 3: post-apply scans
- [ ] Phase 4: frontmatter, stub, dirty/behind, generated
- [ ] Phase 5: mutation proof and docs

## References

- Handoff: tinker-city session of 2026-11-03 (gaps 2 to 7). Not committed; the findings are restated above.
- Sibling: task 252 (unclassifiable names). Independent of this task in outcome.
