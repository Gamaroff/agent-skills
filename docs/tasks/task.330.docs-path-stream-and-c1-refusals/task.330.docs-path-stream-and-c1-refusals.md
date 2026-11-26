---
id: task.330
title: "isDocsPath refuses the NTFS .git stream and C1 controls"
type: task
description: "Close the two isDocsPath gaps task 329's QA found (a .git: alternate-stream segment and a C1 control are read as documentation), and clear the four LOW findings tasks 325 and 329 deferred to it."
tags: [ci, docs-only-rule, security-probe]
category: infrastructure
status: planned
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-26
estimated_effort_hours: 8
github_issue: 957
---

# Technical Task: isDocsPath refuses the NTFS .git stream and C1 controls

**GitHub Issue**: [#957](https://github.com/Gamaroff/agent-skills/issues/957)

**Status:** Planned

---

## 1. Overview

`isDocsPath` decides which changed paths are documentation, and so whether the pipelines may stop
waiting for CI. Task 329's QA found two spellings it reads as documentation and should not: a segment
that NTFS reads as the repository's `.git` directory (`.git:` followed by a stream name), and a name
holding a C1 control character (U+0080–U+009F). This task refuses both. It also clears the four LOW
findings tasks 325 and 329 deferred here.

**Scope**: one predicate in `shared/resources/ci-tree-equivalence.js`, the `git-name` corpus and its
mutation test, and three wording fixes.

**Key deliverables:**

- `isDocsPath` reads a `.git:` stream segment and a C1 control as code;
- the `git-name` corpus holds a hostile case for each, proved by a mutation row;
- the deferred wording findings T325-CR-501, T325-CR-502, T329-QA-9 and T329-QA-10 are fixed.

**Expected outcome**: no spelling that git itself treats as the repository's internals, and no control
character, is ever read as documentation.

---

## 2. Motivation

### Current Problems

1. **A `.git:` stream segment is documentation.** On NTFS, `.git::$INDEX_ALLOCATION` and `.git:x` name
   the `.git` directory. Git refuses such paths for that reason, but `isDocsPath` folds only case,
   ignorable code points, trailing dots and spaces, and `git~1`. Found in task 329 QA cycle 2
   (`docs/tasks/task.329.git-name-probe-sink/task.329.gate.2.git-name-probe-sink.yml`, line 14).
2. **A C1 control is documentation.** The control-character refusal covers U+0000–U+001F and U+007F
   only. The same engine already refuses all of `\p{Cc}`, C1 included, in `ci.skipMarker`. Found in
   the same QA cycle (gate 2, line 21).
3. **Four deferred LOW findings name wording that is wrong.**
   - T325-CR-501: the bracket refusal's advice names the same refused path.
   - T325-CR-502: the CHANGELOG says "extglob" where only three openers are refused.
   - T329-QA-9: a corpus clause no case exercises.
   - T329-QA-10: a test comment that miscounts the spellings it lists.

### Benefits of Solution

1. Every spelling git treats as `.git` waits for CI.
2. Every control character is refused once, with one rule, in the path and in the marker alike.
3. Each corpus and test claim is true of the cases behind it.

---

## 3. Technical Background

Every result below was run on 2026-11-26 at `ba0882a1f` (develop, after task 325's merge).

### Current Architecture

- **The `.git` fold.** `shared/resources/ci-tree-equivalence.js:135` *(`function isDotGitSegment`)*
  removes `DOTGIT_IGNORABLE` code points, strips trailing dots and spaces, lowercases, and compares to
  `.git` or `git~1`. Its only caller is `isDocsPath`, at `:192` *(`some(isDotGitSegment)`)*
  (`git grep -n isDotGitSegment -- shared/resources ':!shared/resources/tests'`).
- **The control refusal.** `:182` *(`function hasPathFormDefect`)*:
  `if (/[\u0000-\u001f\u007f]/.test(p)) return true;`. `hasPathFormDefect` is also asked about each
  exclusion's remainder by `interpretConfig` (task 325).
- **The precedent.** `:109` *(`const UNPRINTABLE = /[\p{Cc}\p{Cf}\p{Cs}]/u`)* refuses C1 in
  `ci.skipMarker`, which `push-policy.test.mjs:227` pins for U+0080, U+0085, U+009B and U+009F.
- **Measured today** (`command node -e` over `isDocsPath(x, ["**"])`):

  | Name | Today |
  | :-- | :-- |
  | `docs/.git::$INDEX_ALLOCATION/x.md` | docs |
  | `docs/.git:x/y.md` | docs |
  | `.git:stream` | docs |
  | `docs/a` + U+0085 + `.md`, likewise U+0080 and U+009F | docs |
  | `docs/.git/x.md` | code |
  | `docs/a:b.md` | docs |

- **The mutation test.** `shared/resources/tests/security-probe.test.mjs:4669`
  *(`const IS_DOCS_LINES`)* anchors each refusal by its exact source line, and `GIT_NAME_MUTATIONS`
  (`:4698`) lists the hostile cases each removed line must reproduce. Its comment (`:4666`) says each
  refusal has two spellings, inline and in `hasPathFormDefect`. Task 325 has merged, so only the
  helper spelling exists, and `dotGit` and `config` never had two (T329-QA-10).
- **The corpus.** `shared/resources/security-input-corpus.mjs:742` *(`id: "control-char"`)* says
  "Refuse any character below U+0020, and U+007F". `:805` *(`id: "plus-signs"`)* names a clause
  ("compiles a glob to a regex without escaping its literal parts") that no case reaches, because the
  sink probes with `**` (T329-QA-9). The floor `"git-name": { hostile: 14, legitimate: 8 }` is at
  `shared/resources/tests/security-input-corpus.test.mjs:63`. The corpus tables in
  `security-input-corpus.md` are generated by `renderCorpusTables()`, and a test asserts they match.
- **The wording.** The bracket refusal is at `ci-tree-equivalence.js:823`
  *(`/[{}[\]|]|[@!+]\(/`)*. Its message ends "List each path as its own exclusion …, or use * or ?".
  `CHANGELOG.md:31` and `docs/runbooks/ci-docs-only-skip.md:205` say "extglob".

### Target Architecture

1. `isDotGitSegment` drops everything from the first `:` before the other folds, as git's NTFS check
   does for an alternate data stream. A name with a colon that is not `.git` is unchanged.
2. `hasPathFormDefect` refuses `\p{Cc}`: C0, DEL and C1, one class as in `UNPRINTABLE`. Format
   characters (`\p{Cf}`) stay out of scope (§ 4).

**Tried** in a sibling worktree of `ba0882a1f`, with both lines changed:

| Name | Today | After |
| :-- | :-- | :-- |
| `docs/.git::$INDEX_ALLOCATION/x.md` | docs | code |
| `docs/.git:x/y.md` | docs | code |
| `docs/GIT~1:a/b.md` | docs | code |
| `docs/a` + U+0085 + `.md`, and U+009F | docs | code |
| `docs/a:b.md`, `docs/git:x.md` | docs | docs |
| `docs/a` + U+00A0 + `b.md` (no-break space, not a control) | docs | docs |

Suites on the unmodified worktree: `ci-tree-equivalence` 126/126, `push-policy` 45/45,
`security-probe` 322/322, `security-input-corpus` 24/24. With the change: the same, except one
`security-probe` test, "each isDocsPath refusal removed reproduces exactly its git-name cases"
(`:4752`). It fails with "anchor "control" must occur exactly once … (none found: isDocsPath was
rewritten, so update IS_DOCS_LINES)". The test is designed to fail that way when a refusal line
changes, so the remedy updates the anchor. It overrides no decision a test holds.

The two deferred remedies were also run at `ba0882a1f`:

- `isDocsPath("docs/c++.md", ["docs/c++.md"])` is `true`, and `isDocsPath("docs/cc.md", ["docs/c++.md"])`
  is `false`. So the matcher reads a pattern's literal `+` literally, and a case can make QA-9's
  clause true.
- `isDocsPath("docs/blog/[slug].md", ["docs/**", "!docs/blog/?slug?.md"])` is `false`. So the `?`
  workaround T325-CR-501 names excludes a bracketed file.

### Important Clarifications

- **Only a `.git` segment is folded at `:`.** `docs/a:b.md` stays documentation. The fold is inside
  `isDotGitSegment`, which answers only "is this segment `.git`?".
- **The C1 refusal also reaches exclusions.** `interpretConfig` asks `hasPathFormDefect` about each
  exclusion's remainder, so an exclusion holding a C1 control becomes a usage error. Such an exclusion
  could only match a path `isDocsPath` now refuses, so it would exclude nothing (Breaking Change 2).

---

## 4. Scope

### In Scope

✅ `isDotGitSegment` and `hasPathFormDefect` in `ci-tree-equivalence.js`

✅ The `git-name` corpus, its floor and generated tables, and the `IS_DOCS_LINES` / `GIT_NAME_MUTATIONS` tables

✅ The bracket refusal message, `CHANGELOG.md` and the runbook's exclusion paragraph

### Out of Scope

❌ **Format characters (`\p{Cf}`: zero-width and bidi marks) in a path.** A legitimate name may hold
one, and `isDotGitSegment` already folds the ones that spell `.git`. A separate decision.

❌ **The percent-encoded and symlink corpus cases.** Those are the `path` sink. They never applied to
`isDocsPath`, which task 329 settled.

❌ **Unicode line separators (U+2028/U+2029).** `**` does not cross them, so such a name is already
code (task 329 QA cycle 2).

---

## 5. Breaking Changes

### Breaking Change 1: two more spellings are code

**What Changed**: a path with a `.git:` stream segment, or one holding a C1 control, is no longer
documentation. Before, a pattern such as `docs/**` admitted it.

**Impact**: the pipelines wait for CI on such a change. They wait more, never less. Git refuses to
track the `.git:` form, and a C1 control in a tracked name is rare.

**Migration**: none needed. The new answer is the one that waits.

### Breaking Change 2: an exclusion holding a C1 control is a usage error

**What Changed**: `ci.docsOnly.patterns` refuses such an exclusion (exit 2), as it already refuses one
holding a C0 control.

**Migration**: remove the control character from the pattern.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.330.plan.docs-path-stream-and-c1-refusals.md](task.330.plan.docs-path-stream-and-c1-refusals.md)

### Phase 1: The predicate and its corpus

**Risk Level**: Low

**Files**:
- `shared/resources/ci-tree-equivalence.js`
- `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md` (generated tables)
- `shared/resources/tests/security-input-corpus.test.mjs`, `security-probe.test.mjs`,
  `ci-tree-equivalence.test.mjs`

**Changes**:
- [ ] Write the failing cases first: the § 8 rows, as `git-name` corpus cases and unit cases
- [ ] Fold a `.git` segment at its first `:`, and refuse `\p{Cc}`
- [ ] Update `IS_DOCS_LINES` to the one spelling of each refusal, correct its comment (T329-QA-10), and add the mutation rows

**Dependencies**: none (tasks 325 and 329 are merged)

### Phase 2: Corpus and test claims

**Risk Level**: Low

**Files**:
- the corpus module and tables, and the tests of Phase 1

**Changes**:
- [ ] Make the `plus-signs` clause true with a case that holds a literal `+` in the pattern (T329-QA-9)
- [ ] Bring the `control-char` case's `correct` text into line with the new class

**Dependencies**: Phase 1

### Phase 3: Wording and records

**Risk Level**: Low

**Files**:
- `shared/resources/ci-tree-equivalence.js` (the bracket message)
- `CHANGELOG.md`, `docs/runbooks/ci-docs-only-skip.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [ ] The bracket message, the runbook and the CHANGELOG say to write each `[` or `]` as `?` for a literal bracketed name (T325-CR-501)
- [ ] The CHANGELOG and the runbook name the three refused openers `@(`, `!(` and `+(`, as `configuration.md` does (T325-CR-502)
- [ ] Write the CHANGELOG entry for § 5; run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 and 2

---

## 7. Files Summary

### Files to Create

None.

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/ci-tree-equivalence.js` - the fold, the control class, the bracket message
2. ✅ `shared/resources/security-input-corpus.mjs` - the new `git-name` cases and the two corrected texts
3. ✅ `shared/resources/security-input-corpus.md` - regenerated tables (`renderCorpusTables()`)

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/ci-tree-equivalence.test.mjs` - the § 8 unit rows
5. ✅ `shared/resources/tests/security-probe.test.mjs` - `IS_DOCS_LINES`, its comment, `GIT_NAME_MUTATIONS`
6. ✅ `shared/resources/tests/security-input-corpus.test.mjs` - the `git-name` floor

### Files to Modify (Documentation)

7. ✅ `CHANGELOG.md`
8. ✅ `docs/runbooks/ci-docs-only-skip.md`

### Generated

9. ✅ `skills/*/references/` copies of 1 and 2, by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| `isDocsPath` over each "Tried" row of § 3 | as there | as there |
| a `git-name` hostile case for the `.git:` stream (two spellings) and for a C1 control | accepted (reproduced) | refused (held) |
| a `git-name` legitimate case `docs/a:b.md` | accepted | accepted |
| `isDocsPath("docs/c++.md", ["docs/c++.md"])`, and `docs/cc.md` against the same pattern | `true`, `false` | unchanged, now pinned |
| `patterns: ["docs/**", "!docs/a<U+0085>.md"]` | accepted | usage error naming `ci.docsOnly.patterns` |
| the bracket refusal's message | names no workaround for a literal bracket | names `?` for each `[` and `]` |

**Command**: `command node --test shared/resources/tests/ci-tree-equivalence.test.mjs shared/resources/tests/security-probe.test.mjs shared/resources/tests/security-input-corpus.test.mjs shared/resources/tests/push-policy.test.mjs`

### Mutation Tests

Each alone turns a named test red. The QA report records each one with the test it turned red:

- the `:` fold removed: the `.git:` stream cases reproduce;
- the control class narrowed back to C0 and DEL: the C1 case reproduces;
- the fold applied to every segment, not only `.git`: the `docs/a:b.md` legitimate case is refused.

`GIT_NAME_MUTATIONS` already proves each refusal line by removing it, so the first two are new rows
there.

### Consumer Tests

`npm run test:remote` runs the whole suite.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the § 8 table holds in a test
- [ ] `isDotGitSegment` has no new caller: `git grep -n isDotGitSegment -- shared/resources ':!shared/resources/tests'` still shows only `isDocsPath`

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` names both changes of § 5, and names `@(`, `!(` and `+(` where it said "extglob"
- [ ] The bracket message and the runbook say to write each `[` or `]` as `?` for a literal bracketed name

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

#### 1. A legitimate name with a colon becomes code

**Risk**: the fold reaches beyond a `.git` segment
**Probability**: Low
**Impact**: Low (the run waits for CI)
**Mitigation**: the fold is inside `isDotGitSegment`; the `docs/a:b.md` legitimate case and its mutation

#### 2. A consumer's exclusion holds a C1 control

**Risk**: the run stops with a usage error
**Probability**: Low
**Impact**: Low
**Mitigation**: the message names the key, as for a C0 control today

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a legitimate documentation name, with no control character and no `.git` segment, read as code

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: the command of § 8

### Partial Rollback (1-2 hours)

Phase 3 (wording) and Phase 1 can be reverted apart.

### Forward Fix (< 4 hours)

Wording of the message, the runbook or the CHANGELOG.

### Rollback Triggers

**Critical**: a `.git` spelling or a control character read as documentation

**Non-critical**: wording

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-26 | 1.0     | Initial draft — from task 329 gate 3 and task 325 gate 5 deferred findings | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The predicate and its corpus

- [ ] Failing cases
- [ ] Fold and control class
- [ ] Anchors and mutation rows

### Phase 2: Corpus and test claims

- [ ] `plus-signs`
- [ ] `control-char` text

### Phase 3: Wording and records

- [ ] Bracket advice
- [ ] Extglob openers
- [ ] CHANGELOG and bundle

---

## References

- `docs/tasks/task.329.git-name-probe-sink/task.329.gate.2.git-name-probe-sink.yml` (the two gaps, as found)
- `docs/tasks/task.329.git-name-probe-sink/task.329.gate.3.git-name-probe-sink.yml` (`recommendations.future`; T329-QA-9 and T329-QA-10)
- `docs/tasks/task.325.docs-only-rule-exclusions/task.325.gate.5.docs-only-rule-exclusions.yml` (T325-CR-501, T325-CR-502)

## Notes

- QA report: `task.330.qa.{N}.docs-path-stream-and-c1-refusals.md`; gate: `task.330.gate.{N}.docs-path-stream-and-c1-refusals.yml`; bugs: `task.330.bug.{N}.{name}.md`, all in this directory.
