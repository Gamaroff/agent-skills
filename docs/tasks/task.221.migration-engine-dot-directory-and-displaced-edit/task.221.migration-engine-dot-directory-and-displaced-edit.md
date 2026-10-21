---
id: task.221
title: "Migration engine: dot-directory references and displaced-block edits"
type: task
description: "Fix the two low findings task.211 carried from QA gate 6 in migrate-doc-numbering.mjs: outsideReferences misses a root-relative path into a dot-directory, and editFrontmatter writes above a displaced frontmatter block when called directly."
tags: [migration-engine, doc-numbering, follow-up, task.211]
category: refactoring
status: planned
priority: Low
created: 2026-10-21
updated: 2026-10-21
assignee:
estimated_effort_hours: 2
depends_on: task.211
github_issue: 713
---

# Technical Task: Migration engine: dot-directory references and displaced-block edits

**Status:** Planned

**GitHub Issue**: [#713](https://github.com/Gamaroff/agent-skills/issues/713)

---

## 1. Overview

Task.211 (PR #712) shipped with two low findings from QA gate 6, both in
`shared/resources/migrate-doc-numbering.mjs`. This task fixes both, gives each a test row, and
mutation-proves each row.

**Scope**: two functions in the engine, the matching rows in its test file, and the bundled copy in
`skills/review-prd/references/`.

**Key deliverables**:

- `outsideReferences` compares a path that starts with a dot-directory (`.docs/prd.md`,
  `${ROOT}/.docs/prd.md`) at the repository root as well as at the file's own directory (CR-1).
- `editFrontmatter` returns its input unchanged unless the block is `none` or `closed` (CR-2).
- One test row per fix, each shown red with the fix reverted.

**Expected outcome**: the engine's code agrees with its own docstrings on both points, and no
reachable behaviour of the CLI changes for any repository without a dot-directory PRD root.

---

## 2. Motivation

### Current Problems

- **CR-1: a dot-directory path is read as relative-only.** `outsideReferences`
  (`shared/resources/migrate-doc-numbering.mjs:1108`) picks its resolution forms with
  `const forms = rest.startsWith(".")` (`:1140`). The test is meant to catch `./` and `../`, but it
  also catches `.docs/prd.md`. So a script at `scripts/run.sh` that says `cat .docs/prd.md` or
  `cat ${ROOT}/.docs/prd.md` is resolved only against `scripts/`. It never matches the move source
  `.docs/prd.md`, and the reference is not reported as `stale-reference`. Measured on `develop`
  `47ddcc92`: both forms return `[]`, while `README.md` (at the root, where both forms coincide)
  returns the hit.
- **CR-2: `editFrontmatter` edits a block it says it leaves alone.** Its docstring (`:895`) says
  "An unclosed or displaced block is left alone". The code (`:897`) only special-cases `none`. On a
  displaced document (`"\n---\na: 1\n---\nbody\n"`, `frontmatterState` → `displaced`) it reads the
  blank line 0 as the opening fence, finds the real opening `---` as the close, and inserts
  `prd_number: 1` above the block. Measured on `develop`: output `"\nprd_number: 1\n---\na: 1\n---\nbody\n"`.
- **CR-2 is unreachable from the CLI today.** The only caller (`:1341`) runs after the
  `displaced-frontmatter` blocker (`:1336`), so a displaced file is refused before the edit. The
  defect is a trap for the next caller, not a live corruption.
- **CR-1 needs an unusual layout to bite.** Gate 6 notes the default root is `docs/prd`, and no
  config, template or test in the repository uses a dot root (0 hits). A consumer whose outside move
  source sits in a dot-directory gets a silent miss, which is the failure `stale-reference` exists
  to prevent.

### Benefits of the Fix

- `stale-reference` reports every path shape its docstring lists, including a dot-directory.
- `editFrontmatter` is safe to call directly, as its docstring already promises.
- Both gate-6 advisories close, so task.211's trail carries no open engine finding.

---

## 3. Technical Background

### Current Architecture

- `outsideReferences(file, text, sources)` (`:1108`) scans `text` for `PATH_TOKEN` matches
  (`:1087`). It strips a leading variable (`$VAR/…`, or a `/…` rooted after `}`, `)` or a closing
  quote, via `VARIABLE_BEFORE` at `:1090`) into `rest`. It then resolves `rest` against the file's
  directory only, or against both the directory and the repository root:
  `const forms = rest.startsWith(".") ? [P.join(dir, rest)] : [P.join(dir, rest), P.normalize(rest)];` (`:1140`).
- `frontmatterState(text)` (`:864`) returns `closed`, `unclosed`, `displaced` or `none`.
- `editFrontmatter(text, edits)` (`:897`) creates a block when the state is `none`. Otherwise it
  takes `close = lines.findIndex((l, i) => i > 0 && isFence(l))` and edits lines `1..close-1`,
  returning `text` unchanged only when no later fence exists.
- `planEdits` (`:1324`–`:1341`) calls `frontmatterState` first, pushes `unclosed-frontmatter` or
  `displaced-frontmatter`, and calls `editFrontmatter` only in the `else` branch.
- Tests live in `shared/resources/tests/migrate-doc-numbering.test.mjs`. The `outsideReferences`
  must-flag and must-not-flag rows are at `:1488`; the `editFrontmatter` shapes row is at `:1157`
  and the idempotence row at `:1394`.
- `skills/review-prd/references/migrate-doc-numbering.mjs` is the bundled copy, generated by
  `npm run bundle` (it differs from the source only in its AUTO-GENERATED header line).

No other function in the file dedupes or normalises path tokens: `replaceTargets` (`:1062`) rewrites
link targets, and `outsideReferences` is the only resolver of non-link mentions. This task changes
both functions in place and adds no new mechanism.

### Target Architecture

- `outsideReferences`: the relative-only branch is taken only for a `./` or `../` token:
  `const forms = /^\.\.?\//.test(rest) ? [P.join(dir, rest)] : [P.join(dir, rest), P.normalize(rest)];`.
  A token such as `.docs/prd.md` is then compared at the root too, like `docs/prd.md` already is.
- `editFrontmatter`: compute `frontmatterState(text)` once. Return `text` unchanged for `unclosed`
  and `displaced`; create the block for `none`; edit in place for `closed`. The docstring then holds
  as written.

Both changes were run on a scratch copy of the engine before this document was written. The two
CR-1 forms return the hit, the CR-2 output equals its input, and all 68 tests in the existing file
pass against the patched copy.

### Important Clarifications

- `planEdits` already refuses unclosed and displaced files, so CR-2 changes no CLI output. Its row
  calls `editFrontmatter` directly, which is the only path that reaches the defect.
- The CR-1 change widens what `stale-reference` reports. A repository with a mention like
  `.docs/prd.md` of an outside move source, which passed the plan before, now blocks until the
  mention is fixed. That is the intended behaviour.

---

## 4. Scope

### In Scope

- `shared/resources/migrate-doc-numbering.mjs`: the `forms` predicate in `outsideReferences`, and
  the state guard in `editFrontmatter`.
- `shared/resources/tests/migrate-doc-numbering.test.mjs`: one dot-directory row set and one
  displaced-edit row.
- `skills/review-prd/references/migrate-doc-numbering.mjs`: regenerated with `npm run bundle`.
- `CHANGELOG.md`: one `Fixed` entry under `[Unreleased]`.

### Out of Scope

- ❌ PC-1 (task.211 §3 Target naming the two QA-added blocker codes). Fixed on `develop` in
  `47ddcc92`.
- ❌ Any other path shape for `stale-reference`. Gate 6 named only the dot-directory miss.
- ❌ Changing `planEdits` or the blocker list. Both are correct today.

---

## 5. Breaking Changes

None. API stable. `outsideReferences` and `editFrontmatter` keep their signatures and return
shapes. The only observable change is that `stale-reference` now also reports a dot-directory
mention of an outside move source (see §3 Important Clarifications). The migration path for a
repository that hits it is the one review-prd already prints for `stale-reference`: point the
mention at the new path, or make it a Markdown link, then plan again.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.221.plan.migration-engine-dot-directory-and-displaced-edit.md](task.221.plan.migration-engine-dot-directory-and-displaced-edit.md)

### Phase 1: CR-1, dot-directory references (Low risk)

- [ ] Add must-flag rows to the `outsideReferences` test (`:1488` block, or a new test beside it)
  with sources `[".docs/prd.md"]`: `scripts/run.sh` naming `.docs/prd.md` and
  `${ROOT}/.docs/prd.md`. Add a must-not-flag row: `scripts/run.sh` naming `docs/prd.md`. Run it
  and confirm the must-flag rows fail on today's code.
- [ ] Change the `forms` predicate (`:1140`) to `/^\.\.?\//.test(rest)`.
- [ ] Update the `outsideReferences` docstring, which already says "a `./` or `../` token against
  the file's directory": no wording change unless the code now disagrees with it.

### Phase 2: CR-2, displaced-block edit (Low risk)

- [ ] Add a row that calls `editFrontmatter` directly on a displaced document
  (`"\n---\na: 1\n---\nbody\n"`) and on an unclosed one (`"---\na: 1\nbody\n"`), and asserts each
  output equals its input. Confirm the displaced case fails on today's code.
- [ ] Guard `editFrontmatter` (`:897`) on `frontmatterState`: unchanged for `unclosed` and
  `displaced`.

### Phase 3: Bundle, mutation-prove, record (Low risk)

- [ ] `npm run bundle`; `npm run bundle:check` clean.
- [ ] Mutation-prove each fix: revert it alone, confirm its row goes red, restore it. Record both in
  the implementation report.
- [ ] `CHANGELOG.md` `[Unreleased]` → `Fixed` entry.
- [ ] `npm run ci` green.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/migrate-doc-numbering.mjs`: `outsideReferences` `forms` predicate;
   `editFrontmatter` state guard.

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs`: dot-directory rows; displaced-edit
   row.

### Files to Modify (Dependencies)

3. ✅ `skills/review-prd/references/migrate-doc-numbering.mjs`: generated by `npm run bundle`,
   never hand-edited.

### Files to Modify (Documentation)

4. ✅ `CHANGELOG.md`: one `Fixed` entry.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `outsideReferences` and `editFrontmatter`, called directly.
- **Actions**: the rows in Phase 1 and Phase 2. Each must-flag row has a control in the same block
  that the fix must leave alone: `docs/prd.md` from `scripts/` for CR-1, and the existing `none` and
  `closed` rows at `:1157` for CR-2.
- **Command**: `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`
- **Target**: every existing row still passes (68 today), plus the new rows.

### Integration Tests

- **Scope**: the CLI plan on a fixture repository.
- **Actions**: none new. CR-2 is unreachable from the CLI, and CR-1's change is in a pure function
  whose existing CLI rows (task.211 `stale-reference` fixtures) keep passing. If the developer adds
  one, it is a fixture whose outside move source is `.docs/prd.md` with a `scripts/x.sh` naming it,
  expecting a `stale-reference` blocker.

### Contract Tests

- `evals/shared/tests/prd-skill-numbering.test.mjs` runs the bundled copy at
  `skills/review-prd/references/migrate-doc-numbering.mjs`. It must stay green after the bundle.

### Performance Tests

- No new loop or scan. The existing linearity row (`:1543`) must still pass.

### Consumer Tests

- review-prd's plan block is the only consumer of the CLI. Its output for any repository without a
  dot-directory mention of an outside move source is unchanged.

---

## 9. Success Criteria

### Functional

- [ ] `outsideReferences("scripts/run.sh", "cat .docs/prd.md", [".docs/prd.md"])` returns one hit
  with source `.docs/prd.md` (Phase 1 changes the `forms` branch that decides this).
- [ ] `outsideReferences("scripts/run.sh", "cat ${ROOT}/.docs/prd.md", [".docs/prd.md"])` returns
  one hit (Phase 1).
- [ ] `outsideReferences("scripts/run.sh", "cat docs/prd.md", [".docs/prd.md"])` returns `[]`.
- [ ] `editFrontmatter` returns its input byte-for-byte for a displaced and for an unclosed document
  (Phase 2 adds the guard that decides this).
- [ ] Every existing row in `migrate-doc-numbering.test.mjs` passes.

### Performance

- [ ] The linearity row (`:1543`) passes unchanged.
- [ ] No new pass over the input in either function.

### Code Quality

- [ ] Each fix is mutation-proven: reverted alone, its row fails; restored, it passes. Both recorded
  in the implementation report.
- [ ] `npm run bundle:check` reports 0 problems.
- [ ] `npm run ci` passes.

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` has one `Fixed` entry naming both findings.
- [ ] No consumer action needed beyond the existing `stale-reference` fix instructions.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

1. **A dot-directory mention that was silently passed now blocks**
   - **Risk**: a consumer repository with a `.docs/prd.md`-style mention of an outside move source
     sees a new `stale-reference` blocker.
   - **Probability**: Low (0 dot roots in this repository; gate 6).
   - **Impact**: Low. The plan stops with the standard fix instruction.
   - **Mitigation**: the CHANGELOG entry names the change.
2. **The predicate change drops a form some token relied on**
   - **Risk**: a token beginning `.` that is neither `./`, `../` nor a dot-directory.
   - **Probability**: Low. `PATH_TOKEN` (`:1087`) requires a `/`, so the first segment is a name.
   - **Impact**: Low. The token gains a root form; it cannot lose its directory form.
   - **Mitigation**: the 68 existing rows, run against the patched copy, all pass.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- An existing `migrate-doc-numbering` row or `prd-skill-numbering` row fails after merge.
- review-prd reports a `stale-reference` on a repository with no dot-directory mention.

**Steps**:

1. `git revert` the task's merge commit on `develop`.
2. `npm run bundle:check` and `npm run ci`.
3. Reopen task.221 with the failing input recorded.

**Verification**: the engine suite passes at its pre-task count.

---

### Partial Rollback (1-2 hours)

**When to Use**: only one of the two fixes misbehaves.

**Steps**:

1. Revert that function's hunk and its test row; keep the other.
2. Re-bundle, run the engine suite and `npm run ci`.

---

### Forward Fix (< 4 hours)

**When to Use**: a dot-directory token resolves to the wrong source, with no other row affected.

**Approach**: add the failing token as a row and narrow the predicate.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:

- Any pre-existing engine or contract row fails.

**Non-Critical (Forward Fix)**:

- A new dot-directory edge case found after merge.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-21 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: CR-1, dot-directory references
- [ ] Phase 2: CR-2, displaced-block edit
- [ ] Phase 3: Bundle, mutation-prove, record

## References

- Task.211: [task.211.migration-engine-monolith-and-domainless-prds.md](../task.211.migration-engine-monolith-and-domainless-prds/task.211.migration-engine-monolith-and-domainless-prds.md)
- QA gate 6 (CR-1 note and advisory CR-2): [task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml](../task.211.migration-engine-monolith-and-domainless-prds/task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml)
- PR review: [task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md](../task.211.migration-engine-monolith-and-domainless-prds/task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md)

## Notes

- QA report: `task.221.qa.{N}.migration-engine-dot-directory-and-displaced-edit.md`
- Bug reports: `task.221.bug.{N}.{bug-name}.md`
- Quality gate: `task.221.gate.{N}.migration-engine-dot-directory-and-displaced-edit.yml`
