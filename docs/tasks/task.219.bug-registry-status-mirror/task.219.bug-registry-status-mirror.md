---
id: task.219
title: "General-bug registry status: one writer at every transition"
type: task
description: "Give the general-bug registry's Status cell one tested writer, a --bug-status mode of registry-tick.js, and call it at every bug status transition, including the two /qa-fix makes after a reopen that today leave the row stale."
tags: [bug-registry, registry-tick, qa-fix, develop-bug, follow-up]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-20
updated: 2026-10-20
assignee:
estimated_effort_hours: 8
github_issue: 706
---

# Technical Task: General-bug registry status: one writer at every transition

**Status:** Planned

**GitHub Issue**: [#706](https://github.com/Gamaroff/agent-skills/issues/706)

---

## 1. Overview

A general bug's status is stored twice: in the bug file's frontmatter `status:`, and in the Status cell of its row in `docs/bugs/bug-registry.md`. develop-bug writes both at each transition, as four separate prose instructions. After a reopen, `/qa-fix` moves the bug file to In Progress and then Ready for QA, and it writes neither status into the row. task.199's QA gate 4 recorded this as a source gap (`recommendations.future`).

This task adds one writer for the row, a `--bug-status` mode of `shared/resources/registry-tick.js`, and calls it from every place that writes a general bug's status. It also adds the CI backstop this repository has for tasks but not for bugs: a drift test that fails when a bug file and its row disagree.

**Scope**: `shared/resources/registry-tick.js` and its test, the status-writing steps of `skills/qa-fix/SKILL.md` and `skills/develop-bug/` (SKILL.md and three step docs), a new `evals/shared/tests/bug-registry-drift.test.mjs`, the bundled copies, and `CHANGELOG.md`.

**Key deliverables**:

1. `registry-tick.js --bug-status --file <bug.md>` sets the bug's registry row to the file's status, in the registry's own vocabulary.
2. Every general-bug status write in qa-fix and develop-bug is followed by that call. The rule is no longer restated as prose at each site.
3. A drift test fails CI when a general bug's file status and its row disagree.

**Expected outcome**: a consumer's bug-registry drift guard stays green through a whole develop-bug run, including reopen cycles. This repository gains the same guard.

---

## 2. Motivation

### Current Problems

1. **qa-fix leaves the row stale after a reopen.** develop-bug Step 5b reopens the bug and mirrors `reopened` into the row (`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:174`). It then invokes `/qa-fix` (`:176`). qa-fix moves the bug Reopened → In Progress → Ready for QA (`skills/qa-fix/SKILL.md:1308`, the Status Flow block under `### Bug Status Lifecycle`, and `#### Starting Investigation (New/Reopened → In Progress)`). `git grep -n "bug-registry" skills/qa-fix/SKILL.md` returns nothing (measured at `9067ba92`). So the row reads `⚠️ Reopened` while the file reads `ready-for-qa`, until develop-bug Step 7 writes `closed`.
2. **The cost is a false red in consumers.** develop-bug's own callout (`develop-bug-step-3-investigate-fix.md:18-31`) records it. tinker-city's `scripts/check-bug-doc-consistency.js` runs in `test:guard` and the CI `guards` lane on every push, and it asserts that the row equals the file. Before Step 3 mirrored the row, that lane went red on the first push and stayed red until the close commit (bug.89, bug.90 and bug.91 in that repo). The same false red now happens after every reopen.
3. **The rule is restated four times as prose, and it can only be tested by grep.** Status-writing sites that mirror the row today: `develop-bug-step-3-investigate-fix.md:16` (in-progress) and its callout (ready-for-qa), `develop-bug-step-5-6-verify-loop.md:174` (reopened), and `develop-bug-step-7-close-bug.md:83` (closed). qa-fix is the fifth writer, and it is the one that missed the rule. That is the drift `CLAUDE.md` § Stakeholder Summaries describes: a convention without a chokepoint drifts.
4. **This repository has no bug-registry drift backstop.** `evals/shared/tests/task-registry-drift.test.mjs` fails CI when a task row and its document disagree. Bugs have only `document-status-lifecycle-corpus.test.mjs:128-145`, which checks that each row's status is a legal lifecycle value, not that it matches the file.

### Benefits

- One writer, tested by behaviour: a call site cannot write the wrong vocabulary, the wrong cell or the wrong line.
- qa-fix gets the mirror whoever invokes it, not only when develop-bug is the caller.
- The drift test makes a missed mirror a red CI run here, not only in consumers that wrote their own guard.

---

## 3. Technical Background

### Current Architecture

- **`registry-tick.js`** (`shared/resources/registry-tick.js`, bundled into finalise, develop-next, develop-batch and session-handoff). Two modes:
  - the default tick sets a task row's Status to `accepted`;
  - `--annotate` appends `PR #n merged` to the row.

  It imports `parseRegistry` from `skills/develop-next/scripts/select-next.mjs` through `locateSelector` (`registry-tick.js:158`) and never reimplements it. It rewrites one line of the registry, keeping the line separators (`registry-tick.js:403`, `registryText.split(/(\r?\n)/)`), and keeps the cell's width (`setCell`, `:474`). Every outcome except a usage error exits 0. A bug document answers `not-a-task` (`:247`, `isBugStem`). `finalise --bug` relies on that answer (`skills/finalise/SKILL.md:1362`).
- **The argument surface is pinned.** `shared/resources/tests/registry-tick.test.mjs:345` asserts the CLI's whole argument surface, so a new flag is a deliberate test change.
- **`parseRegistry(text, "bug", path)`** (`select-next.mjs:1243`) returns rows with `registryStatus` (the lowercased raw Status cell), `line` and `path`. It reads columns by header name.
- **The bug lifecycle** is `new → in-progress → ready-for-qa → closed | reopened` (`docs/standards/bug-documents.md:45`; `BUG_LIFECYCLE_STATUSES`, `select-next.mjs:234`).
- **Two registry vocabularies exist.** This repository's rows use the lifecycle token (`closed`, `docs/bugs/bug-registry.md`). tinker-city's use an emoji label, `🆕 New` / `🔧 In Progress` / `🔍 Ready for QA` / `⚠️ Reopened` / `✅ Closed`, which `develop-bug-step-3-investigate-fix.md:27-29` tells the writer to read "from its existing rows".
- **Story and task bugs have no registry row.** Their file names carry the parent stem (`task.67.bug.3.…`, `story.….bug.N.…`). Only `docs/bugs/bug.{N}.{name}/` bugs have one.

### Target Architecture

- **`registry-tick.js --bug-status --file <bug.md> [--registry <path>] [--dry-run] [--json]`.** It extends the existing CLI rather than adding a new one (obs #103). It reuses `locateSelector`, `parseRegistry`, the separator-keeping line rewrite and `setCell`. The default and `--annotate` modes do not change, and a bug file without `--bug-status` still answers `not-a-task`.
  - Reads the file's frontmatter `status:`, with any trailing `# comment` removed. A value outside `BUG_LIFECYCLE_STATUSES` → `not-a-lifecycle-status`.
  - A file that is not a general bug (a parent-stemmed bug, a task, a story) → `not-a-general-bug`, with nothing written.
  - Default registry: `docs/bugs/bug-registry.md`. Row lookup is by bug number.
  - **Vocabulary is read from the registry, never assumed.** If most of the other rows' Status cells are emoji labels, write the emoji label for the target status. Otherwise write the lifecycle token. With no other rows, write the token. The five-entry label map lives in this one file, and `--json` reports the vocabulary it chose.
  - Reasons, all exit 0: `mirrored`, `already`, `dry-run`, `not-a-general-bug`, `not-a-lifecycle-status`, `no-registry`, `no-row`, `row-malformed`, `ambiguous-row`, `engine-unavailable`. Exit 2 is a usage error.
- **Call sites.** Every general-bug status write is followed by one call:

  ```bash
  node .agents/skills/{skill}/references/registry-tick.js --bug-status --file "{bug-file}" --json
  ```

  The sites are qa-fix (In Progress, Ready for QA) and develop-bug Steps 3 (in-progress, ready-for-qa), 5–6 (reopened) and 7 (closed). Each prose instruction to edit the row by hand is replaced by the call and a `reason` table. The tinker-city story and the vocabulary rule stay once, in the Step 3 callout.
- **`evals/shared/tests/bug-registry-drift.test.mjs`.** For every `docs/bugs/bug.{N}.*/bug.{N}.*.md`, the row's status (normalised from either vocabulary) equals the file's status. It imports `parseRegistry` and `BUG_LIFECYCLE_STATUSES`, has a non-vacuity floor, and reports a row-less bug and a file-less row.

### Important Clarifications

- **Why a mode of `registry-tick.js`, not a new CLI.** The row rewrite, the parser import and the exit-0 contract are the hard parts, and they already live in `registry-tick.js`, tested against CRLF, malformed rows and column order (bug 19). A second CLI would copy them, and two copies of "how to rewrite a registry row" drift (`docs/reference/anti-patterns.md`, enumeration class).
- **Why an explicit flag, not auto-detection.** `finalise --bug` calls `registry-tick.js` unconditionally and expects `not-a-task` for a bug (`skills/finalise/SKILL.md:1362`; TASK-125-BUG-4). If the default mode began writing bug rows, finalise would write the row before develop-bug Step 7 B3 decides to close it.
- **Why exit 0 everywhere.** It is the same reason as the task tick: the row is an index, and a missed write must not stop a fix cycle. The drift test is the loud backstop, as `task-registry-drift.test.mjs` is for tasks.
- **create-bug-report is out of scope.** It appends the row at filing time with `new` and is not a transition.
- **Engine availability in consumers.** The CLI needs `develop-next`'s `select-next.mjs`. Under an install profile without develop-next, it answers `engine-unavailable`, exactly as finalise's tick does today. The call sites say to log it and edit the row by hand.

---

## 4. Scope

### In Scope

- ✅ `--bug-status` mode in `shared/resources/registry-tick.js`, with tests
- ✅ The status-writing steps in `skills/qa-fix/SKILL.md` and `skills/develop-bug/` (SKILL.md Step 3 and Step 7 summaries, and the step-3, step-5-6 and step-7 docs)
- ✅ `evals/shared/tests/bug-registry-drift.test.mjs` (already reached by `npm test`'s `evals/shared/tests/*.test.mjs` glob)
- ✅ Bundled copies via `npm run bundle`; `CHANGELOG.md`

### Out of Scope

- ❌ Changing the task tick or `--annotate`
- ❌ create-bug-report's row append at filing time
- ❌ Story and task bugs (no registry row)
- ❌ Migrating either vocabulary to the other
- ❌ review-bug's registry-consistency check (`skills/review-bug/SKILL.md:100`), which reads the row and keeps working unchanged

---

## 5. Breaking Changes

### Breaking Change 1: develop-bug and qa-fix call `registry-tick.js` instead of editing the row by hand

**Before**: an agent edited the Status cell by hand, choosing the vocabulary from the existing rows.
**After**: the step runs `registry-tick.js --bug-status` and logs `reason`.
**Impact**: consumers receive the new step text on `setup-consumer.sh --update`. A consumer without `develop-next` installed gets `engine-unavailable` and is told to edit by hand, which is today's behaviour.
**Migration**: none. The CLI writes the same cell, in the same vocabulary, that the hand edit wrote.

The CLI's argument surface grows by one flag, `--bug-status`. Existing invocations do not change.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.219.plan.bug-registry-status-mirror.md](task.219.plan.bug-registry-status-mirror.md)

### Phase 1: `--bug-status` mode

**Risk**: Medium (the engine is bundled into four skills and gains two more)
**Files**: `shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`

- [ ] Parse `--bug-status`. Refuse it alongside `--annotate` (usage, exit 2)
- [ ] Classify the file: general bug, parent-stemmed bug, or other. Read and validate frontmatter `status:`
- [ ] Detect the registry's vocabulary from the other rows, and map the status
- [ ] Rewrite the Status cell with the existing line rewrite and `setCell`; emit the reasons in §3
- [ ] Tests: each of the five statuses in both vocabularies; idempotent `already`; CRLF registry; a task bug answers `not-a-general-bug`; no row; malformed row; ambiguous cell; `--dry-run` writes nothing; the default mode still answers `not-a-task` for a bug; the argument-surface assertion updated

### Phase 2: Call sites

**Risk**: Medium (pipeline prose that agents execute)
**Files**: `skills/qa-fix/SKILL.md`, `skills/develop-bug/SKILL.md`, `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`, `develop-bug-step-5-6-verify-loop.md`, `develop-bug-step-7-close-bug.md`
**Depends on**: Phase 1

- [ ] qa-fix: call after each general-bug status write (In Progress, Ready for QA), with a `reason` table
- [ ] develop-bug Steps 3, 5–6 and 7: replace each hand edit of the row with the call
- [ ] Keep one statement of why the row matters (the Step 3 callout). The other sites link to it
- [ ] `npm run bundle`

### Phase 3: Drift backstop and changelog

**Risk**: Low
**Files**: `evals/shared/tests/bug-registry-drift.test.mjs` (new), `CHANGELOG.md`

- [ ] Drift test over this repository's general bugs, importing the parser and lifecycle
- [ ] Mutation proof: change one row's status and the test goes red
- [ ] CHANGELOG entry

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/registry-tick.js`: `--bug-status` mode
2. ✅ `skills/qa-fix/SKILL.md`: the call at its two bug status writes
3. ✅ `skills/develop-bug/SKILL.md`: Step 3 and Step 7 summaries name the call
4. ✅ `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`
5. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
6. ✅ `skills/develop-bug/references/develop-bug-step-7-close-bug.md`
7. ✅ `skills/*/references/registry-tick.js`: regenerated by `npm run bundle` (gaining qa-fix and develop-bug), never edited by hand

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/registry-tick.test.mjs`
9. ✅ `evals/shared/tests/bug-registry-drift.test.mjs` (new)

### Files to Modify (Dependencies)

None. `npm test` already globs `evals/shared/tests/*.test.mjs` (`package.json` `test` script).

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`

### Files to Delete

None.

**Writer population, measured.** `git grep -n "bug-registry" -- skills/develop-bug skills/qa-fix ':!**/references/develop-pipeline-*'`, keeping only the lines that write a status, gives the four develop-bug sites in §2 and no qa-fix line (at `9067ba92`). The implementer re-runs it before Phase 2 and treats any new hit as in scope.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the `--bug-status` mode
- **Command**: `command node --test shared/resources/tests/registry-tick.test.mjs`
- **Cases**: as Phase 1 lists. Every case runs against a temp registry and asserts both the `reason` and the written bytes (one changed line).

### Integration Tests

- **A full reopen cycle on a fixture.** Start with a general bug at `ready-for-qa` and its row. Step through `reopened → in-progress → ready-for-qa → closed`, calling the CLI after each frontmatter write. After every step, the drift test's comparison function reports agreement.
- **Control case (obs #176).** A registry in the emoji vocabulary whose target row reads `closed` in the plain token. The CLI writes the emoji label (the vocabulary comes from the *other* rows), and the drift test normalises both forms.

### Performance Tests

Not applicable: one file read and one line rewrite per call.

### Consumer Tests

- `npm run ci:fast` per phase; `npm run ci` before the PR
- `npm run bundle:check` clean, with new `references/registry-tick.js` copies under qa-fix and develop-bug

---

## 9. Success Criteria

### Functional

- [ ] `registry-tick.js --bug-status --file docs/bugs/bug.N.x/bug.N.x.md` on a row reading `reopened`, with the file at `ready-for-qa`, rewrites that row's Status cell only and answers `mirrored` (Phase 1)
- [ ] In an emoji-vocabulary registry, the same call writes `🔍 Ready for QA` (Phase 1)
- [ ] A task bug (`task.67.bug.3.x.md`) answers `not-a-general-bug` and writes nothing. A bug file without `--bug-status` still answers `not-a-task` (Phase 1)
- [ ] qa-fix's In Progress and Ready for QA steps each call the CLI for a general bug (Phase 2)
- [ ] develop-bug has no step that edits the row's Status cell by hand (Phase 2; the §7 grep)
- [ ] `bug-registry-drift.test.mjs` passes on `develop` and goes red when one row's status is changed (Phase 3)

### Performance

- [ ] One registry read and at most one write per call
- [ ] No change to the task tick's output on the existing `registry-tick.test.mjs` cases

### Code Quality

- [ ] `npm run ci` passes (format, tests, evals, bundle:check, shellcheck)
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/<skill>` passes for qa-fix, develop-bug and finalise
- [ ] Every change is mutation-proven: revert it and a named test goes red

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 219)` and names the new flag
- [ ] Bundled copies regenerated in the same commit as the source

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The wrong vocabulary is written into a consumer's registry.**
   - Risk: the detection misreads a registry that mixes both forms.
   - Probability: Low. Impact: Medium (the consumer's guard goes red).
   - Mitigation: in a mixed registry, the emoji label wins only when the emoji form is the majority of the other rows. Test a mixed fixture. Report the chosen vocabulary in `--json`.
2. **qa-fix is invoked outside develop-bug with a general bug.**
   - Risk: none new. The call is correct there too, which is why it belongs in qa-fix rather than in develop-bug's loop.
3. **The bundler adds `registry-tick.js` to two more skills, and `select-next.mjs` is not found there.**
   - Mitigation: `locateSelector` already searches `.agents/skills/develop-next/…`. A run without it answers `engine-unavailable`, and the call site says to edit by hand.

### Low Risk Areas

1. **A drift test keyed on a shared token** (obs #135). The test reads registry rows through `parseRegistry`, not by grep, and the population comes from the directory listing with a floor.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the CLI corrupts a registry line, or develop-bug HALTs at a status write.

**Steps**:
1. Revert the task's merge commit on `develop`.
2. Run `npm run bundle:check`.

**Validation**: `npm run ci` green; a `--dry-run` develop-bug resume reaches Step 3.

### Partial Rollback (1-2 hours)

**When to use**: the call sites misbehave but the engine is sound. Revert Phase 2 and keep Phases 1 and 3. The drift test then reports any stale row, which is today's behaviour made visible.

### Forward Fix (< 4 hours)

**When to use**: a vocabulary edge case. Fix it in the label map with a test.

### Rollback Triggers

- **Critical**: any write outside the target row's Status cell
- **Non-critical**: a stale row the drift test catches

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-20 | 1.0     | Initial draft — the /qa-fix bug-registry source gap from task.199's QA gate 4 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: `--bug-status` mode
- [ ] Flag, classification, status read
- [ ] Vocabulary detection and map
- [ ] Row rewrite and reasons
- [ ] Tests

### Phase 2: Call sites
- [ ] qa-fix
- [ ] develop-bug Steps 3, 5–6, 7
- [ ] Bundle

### Phase 3: Drift backstop and changelog
- [ ] Drift test plus mutation proof
- [ ] CHANGELOG

---

## References

- **Source**: [task.199 gate 4](../task.199.setup-config-and-process-docs/task.199.gate.4.setup-config-and-process-docs.yml), `recommendations.future` ("Source gap: /qa-fix does not mirror…")
- **Sibling**: [task.218](../task.218.release-and-wizard-wording-follow-ups/task.218.release-and-wizard-wording-follow-ups.md), the gate's wording items
- **Engine**: `shared/resources/registry-tick.js` (task.103, task.113, bug 19)
- **Precedent**: `evals/shared/tests/task-registry-drift.test.mjs`

---

## Notes

### Important Reminders

- Edit `shared/resources/registry-tick.js`, never a bundled `references/` copy. `npm run bundle` reverts hand edits there.
- `registry-tick.test.mjs` pins the argument surface. Change that assertion deliberately, in the same commit as the flag.

### Known Issues

None.

### Future Improvements

- create-bug-report could append its row through the same writer.
