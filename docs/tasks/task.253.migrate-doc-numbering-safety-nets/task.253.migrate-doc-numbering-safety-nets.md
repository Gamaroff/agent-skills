---
id: task.253
title: "migrate-doc-numbering: link, frontmatter and downstream safety nets"
type: task
description: "Close the remaining tinker-city handoff gaps in migrate-doc-numbering.mjs: multi-line links, a post-apply dead-link and old-path scan, frontmatter validation, a link-free registry stub, a dirty/behind guard, generated files, and a legacy-name warning for consumer scripts."
tags: [migrate-doc-numbering, links, safety-nets]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-03
updated: 2026-11-03
estimated_effort_hours: 16
---

# migrate-doc-numbering: link, frontmatter and downstream safety nets

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.253.review.1.migrate-doc-numbering-safety-nets.md` implemented 2026-11-03

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

Line numbers below were re-measured at review (2026-11-03) against `develop` at `05dc71ad`; they drift, so re-find each by the symbol named.

- Link extraction goes through `extractRelativeLinks` in `shared/resources/doc-links.js:204`, which calls `scanLinks` (`:175`) over the text with fences and code spans blanked. **The matcher already accepts a link whose text spans a newline:** `extractRelativeLinks("a\n[multi\nline](../../epic.1.alpha.md)\n")` returns `[{target:"../../epic.1.alpha.md", line:2}]` (`INLINE_LINK_RE` at `:93` uses `[^\[\]]`, which matches `\n`). The reported `line` is the line of the opening `[`, but the target text sits on line 3.
- The rewrite pass reads those links in `linkPass` (`shared/resources/migrate-doc-numbering.mjs:1133`) and applies each rewrite **per line** in the loop at `:1513-1530` (`byLine.get(r.line)`, then `replaceTargets(lines[ln - 1], from, …)`). A `from` that is not on the reported line is skipped silently (`if (next === s) continue`). That is the likely cause of gap 1; Phase 2 confirms it with the failing test. `planEdits` is at `:1306`.
- `prd_number` is written at `:1357`, `:1372` and `:1390`. Which document shapes reach each site is unverified.
- The registry stub is built by the function holding `MIGRATED_EPICS_HEADING` (`:1671`, builder body near `:1771-1816`; `status: retired` at `:1813`, `# Epic Registry (retired)` at `:1816`).
- A `dirty-path` blocker exists (code list at `:98`, emitted at `:1657`) for paths the run would change. Nothing checks the whole tree or the upstream. `registry-behind` (`:100`) is an unrelated blocker about the epic registry, not the git upstream; a new code must not reuse that name. `(unverified)` whether `--check` and the dry run ask about dirtiness at all.
- No code excludes generated files, and no code scans for legacy-name consumers. `grep -n "graphify" shared/resources/migrate-doc-numbering.mjs` finds nothing.
- Callers of `doc-links.js` `extractRelativeLinks` (found with `grep -rln "doc-links" shared skills scripts tests evals`, excluding bundled `references/` copies): `shared/resources/migrate-doc-numbering.mjs`, `jira-sync.js`, `status-history.js`, `qa-read-back.js`, `finalise-fix-and-recheck.mjs`, and the `sync-jira-*` link tests. `tests/lib/markdown-links.js` has its own separate `extractRelativeLinks`; it is not a caller.

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
- [x] One failing test per gap, using the real-git-repo helper. Where a gap does not reproduce, record that in the QA report and drop it from scope, rather than fix a guess.

**Dependencies**: none.

**Phase 1 results (2026-11-03)** — one test per gap in `shared/resources/tests/migrate-doc-numbering.test.mjs`, run with `command node --test --test-name-pattern='253' …`:

| Gap | Test | Reproduced? | Evidence |
| --- | --- | --- | --- |
| 1. Multi-line link not re-pointed | `253 gap 1` | **Yes** | `[multi\nline](../../epic.1.alpha.md)` is left as written after `--apply`; the fenced control on the next line is also asserted untouched |
| 2. No dead-link / old-path scan | `253 gap 2` | **Yes** (nothing reports them: no `postScan` in the result) | fenced and code-span dangling links, a history file keeping an old path, with live-link and external-URL controls |
| 3. `prd_number` missing on sub-stories | `253 gap 3 (did not reproduce; regression guard)` | **No** | sub-stories `1A` and `1B` come out of `--apply` with `id`, `prd_number`, `epic` and `prd_source`; `planEdits` inserts `prd_number` for every moved story and `postCheck` runs `doc-id.js checkCorpus`. **Dropped from scope**: no fix; the test stays as a guard |
| 4. Stub carries a link | `253 gap 4` | **Yes** | the retired stub keeps `[docs/prd/prd-registry.md](../prd/prd-registry.md)`, dead when the registry lives elsewhere |
| 5. Dirty tree / behind upstream | `253 gap 5`, `253 gap 5 controls` | **Yes** | `--apply` succeeds with an unrelated uncommitted file (probe: exit `ok`, file left dirty), and no warning exists for any mode |
| 6. Generated file edited | `253 gap 6` | **Yes** | `graphify-out/GRAPH_REPORT.md` is rewritten to the new path (probe: ` M graphify-out/GRAPH_REPORT.md`) |
| 7. Legacy-name consumers unreported | `253 gap 7` | **Yes** (no closing line exists) | `scripts/lint.mjs` with `epic.\d+` / `story.\d+` patterns, with a clean script and a new-scheme script as controls |

The `postScan`, `warnings` and `skippedGenerated` result keys the tests read are the new interface; their names are fixed by these tests.

---

### Phase 2: Multi-line links

**Risk Level**: High (shared module)

**Files**: `shared/resources/doc-links.js`, `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [x] Confirm the cause with the Phase 1 failing test: the matcher returns the link, and the per-line apply loop in the migration tool (`byLine` / `replaceTargets`, `:1513-1530`) misses a target that is not on the reported line.
- [x] Confirmed with the Phase 1 test: the matcher returns the link, and the per-line apply loop misses a target that is not on the reported line.
- [x] Fixed with an **additive** `targetLine` on `scanLinks` output (present only when the target sits on a later line than the link's opening, so every existing `deepEqual` and every caller reading `line` is unchanged), read by `linkPass`. The fix does not search forward in the text: a search would also rewrite a fenced copy of the same path on the next line, which the control in `253 gap 1` forbids.
- [x] `doc-links.js` callers re-run: `doc-links.test.mjs` (33 pass) plus the full suite at the end of Phase 5.

**Dependencies**: Phase 1.

---

### Phase 3: Post-apply scan and legacy-name warning

**Risk Level**: Medium

**Files**: `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [x] Dead-link scan over rewritten files; fenced and inline-code links as warnings.
- [x] Old-path scan across tracked files using the move map.
- [x] Closing line `N repo files still hard-code legacy names: …`.

**Dependencies**: Phase 1.

---

### Phase 4: Frontmatter, stub, dirty/behind, generated files

**Risk Level**: Medium

**Files**: `shared/resources/migrate-doc-numbering.mjs`

**Changes**:
- [x] ~~Validate migrated story frontmatter~~ — **dropped: did not reproduce** (Phase 1 results). The existing post-apply `doc-id.js checkCorpus` already fails `--apply` on a story whose `prd_number`, `epic` or id disagrees with its name.
- [x] Generate the registry stub without links.
- [x] Dirty-tree and behind-upstream check. Decision: the tool runs `git fetch --quiet --prune <remote>` in every mode (it updates remote-tracking refs only; `--prune` so a branch deleted on the remote is not read as level), because `@{u}` is the last-fetched state and a guard that skips the fetch reads "level" on the very checkout it exists for. A failed fetch is the `upstream-unverified` warning, not a blocker; no upstream is the `no-upstream` warning. `dirty-tree` and `behind-upstream` are warnings in the dry run and `--check`, blockers for `--apply`. Two existing tests that dirtied the tree before `--apply` now dirty it after.
- [x] Skip generated files and list them. "Generated" is defined by a short list of directory suffixes (for example `*-out/`), each entry with a stated reason, as the plan sets out; a file's own `AUTO-GENERATED` header is a second signal only if Phase 1 shows a real consumer file needs it.

**Dependencies**: Phase 1.

---

### Phase 5: Mutation proof and docs

**Risk Level**: Low

**Changes**:
- [x] Revert each fix in turn and confirm its test goes red.
- [x] Update docs that describe the tool's output; `npm run bundle`; `CHANGELOG.md`.

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.253.qa.3.migrate-doc-numbering-safety-nets.md](./task.253.qa.3.migrate-doc-numbering-safety-nets.md)
- **Gate File**: [task.253.gate.3.migrate-doc-numbering-safety-nets.yml](./task.253.gate.3.migrate-doc-numbering-safety-nets.yml)

### Test Coverage Summary
- **Tests Executed**: 136 in the two touched suites; 7188 in the full run
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No blocking findings. Both cycle 2 fixes are verified and each is held by a test that goes red when the fix is reverted. Advisory items (an unclosed fence dropping its links silently, and the gate 2 list) are recorded in the gate.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-03 | 1.0     | Initial draft | create-task |
| 2026-11-03 | 1.1     | Review passed (8/10) — re-measured 8 stale line anchors, located gap 1's cause in the migration tool's per-line apply loop (matcher is correct), listed `doc-links` callers, defined "generated" | review-task |
| 2026-11-03 |         | Status → ready-for-development | review-task |
| 2026-11-03 | 1.2     | Implemented phases 1–5 (gap 3 did not reproduce and was dropped); mutation proof in `task.253.review.2.mutation-proof.md`; status → ready-for-review | develop-task |
| 2026-11-03 |         | QA gate CONCERNS (90/100) — 1 medium finding | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 iteration (behind guard warns when rev-list fails) | qa-fix |
| 2026-11-03 |         | QA gate CONCERNS (90/100) — 2 findings (1 medium, 1 low) | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 iteration (gap 3 guard asserts values; maskedLinks fence tracking; fetch --prune) | qa-fix |
| 2026-11-03 |         | QA gate PASS (100/100) — 0 findings | qa-task |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: reproduce, tests first
- [x] Phase 2: multi-line links
- [x] Phase 3: post-apply scans
- [x] Phase 4: frontmatter, stub, dirty/behind, generated
- [x] Phase 5: mutation proof and docs

## References

- Handoff: tinker-city session of 2026-11-03 (gaps 2 to 7). Not committed; the findings are restated above.
- Sibling: task 252 (unclassifiable names). Independent of this task in outcome.
