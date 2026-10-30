---
id: task.245
title: "Shared-checkout-safe guards and staging"
type: task
description: "Make the registry writers stage only the line they changed, and narrow the QA re-review's dirty-tree HALT to paths the review reads, so a parallel session's edit in the same checkout neither rides into another task's commit nor stops another task's QA."
tags: [qa-task, qa-story, finalise, develop-next, develop-batch, registry-tick, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-29
updated: 2026-10-30
assignee:
estimated_effort_hours: 8
github_issue: 783
---

# Technical Task: Shared-checkout-safe guards and staging

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.245.review.1.shared-checkout-safe-guards-and-staging.md` implemented 2026-10-30
**GitHub Issue**: [#783](https://github.com/Gamaroff/agent-skills/issues/783)

---

## 1. Overview

**Description:** Two pipeline steps treat a whole file or the whole tree as theirs, and in a
checkout shared by parallel sessions neither is. `/finalise` 6a stages the whole task registry, so a
parallel session's uncommitted row rides into the acceptance commit (obs #127). The QA re-review
HALTs on any tracked change outside the work item, so a parallel session's edit stops a QA cycle it
has nothing to do with (obs #126). This task makes each one key on what it actually owns.

**Scope:** `registry-tick.js` gains a `--stage` mode that stages only the row it wrote. Its three
committing callers (`/finalise` 6a, `develop-next` Step 4 registry arm, `develop-batch` merge lane)
use it instead of `git add docs/tasks/task-registry.md`. The re-review block, which exists in three
copies held equal by a parity test, HALTs only on dirty paths the review reads and warns on the rest.

**Key Deliverables:**

- `registry-tick.js --stage`: after its working-tree write, apply the same row change to the index
  copy, and leave every other edit in the file unstaged.
- The three registry commit sites drop the whole-file `git add`.
- The re-review HALT splits tracked dirt into **halts** (in the PR's change set, or in a directory
  that holds a changed file) and **warns** (everything else), the same way untracked files already
  warn.

**Expected Outcome:** A task accepted in a shared checkout commits its own registry row and nothing
else, and a QA cycle runs to completion while another session edits an unrelated file. An uncommitted
fix to a file the review reads still HALTs.

---

## 2. Motivation

### Current Problems

- **An acceptance commit can carry another session's work.** On task.242's acceptance (2026-10-29),
  the registry also held task 243's uncommitted row and a bumped Next Available counter. Run as
  written, 6a would have committed them on task.242's branch. The orchestrator avoided it by hand,
  building the staged blob with `git hash-object -w` and `git update-index --cacheinfo` (obs #127).
- **The same whole-file `git add` sits in two more writers.** `develop-next` Step 4 and
  `develop-batch`'s merge lane commit the `--annotate` write with `git add docs/tasks/task-registry.md`
  on the base branch, the same shape on a different branch.
- **A QA cycle HALTs on an edit it never reads.** On task.242 QA cycle 8, the only dirty file was the
  registry (task 243's row). The block would have HALTed the cycle; the orchestrator ran the review
  anyway and recorded the deviation in QA report 8 (obs #126).
- **The fix had to be improvised each time.** Both workarounds were improvised in-session, and
  neither is written down where the next session would find it.

### Benefits

- A registry commit carries exactly the row its writer changed, whatever else the file holds.
- A QA cycle survives a parallel session's unrelated edit and names that edit as a warning.
- An uncommitted fix to a file under review still HALTs, which is the case the guard was built for
  (task.168 CR3-7).
- The registry staging becomes one engine behaviour with tests, not three prose blocks.

---

## 3. Technical Background

### Current Architecture

**Registry writers.** `shared/resources/registry-tick.js` has three modes: the default Status tick,
`--annotate` (`registry-tick.js:36`, `* node registry-tick.js --annotate --file <document.md> --pr <n>
[--issue <ref>]`) and `--bug-status`. The tick answers JSON with `line`, `from`, `to`
(`registry-tick.js:554`–`556`, `line: row.line,` / `from: row.registryStatus,` / `to: "accepted",`).
It writes the working file and never touches the index. Each caller then stages the whole file:

| Caller | Site | Staging |
| --- | --- | --- |
| `/finalise` 6a | `skills/finalise/SKILL.md:1634` (`git add docs/tasks/task-registry.md`) | whole file, behind `[ -f docs/tasks/task-registry.md ]` |
| `develop-next` Step 4, `already` resume | `skills/develop-next/SKILL.md:618` (`git add docs/tasks/task-registry.md`) | whole file, behind `git diff --quiet HEAD --` |
| `develop-next` Step 4, `annotated` | `skills/develop-next/SKILL.md:636` (`git add docs/tasks/task-registry.md`) | whole file |
| `develop-batch` merge lane | `skills/develop-batch/SKILL.md:643` (`registry-tick.js --annotate`), commit in prose at `:645` | whole file (prose: "commit `docs(registry): record …`") |

Population command: `git grep -n 'registry-tick.js' -- 'skills/*/SKILL.md' 'shared/resources/*.md'`
plus `git grep -n 'git add docs/tasks/task-registry.md' -- 'skills/*/SKILL.md'`. The other callers
returned are `--bug-status` (`skills/qa-fix/SKILL.md:1333`, `skills/develop-bug/SKILL.md:254`/`:276`),
out of scope (§ 4), and mentions that run nothing (`finalise/SKILL.md:1437`, `:2592`,
`develop-next/SKILL.md:591`, `:648`, `session-handoff/SKILL.md:144`).

**The hand-built workaround** (task.242, 2026-10-29): take the index copy (`git show :path`), apply
the one-row change, `git hash-object -w --stdin`, then
`git update-index --cacheinfo 100644,<hash>,docs/tasks/task-registry.md`. No engine in
`shared/resources/` does this today. `git grep -n 'cacheinfo' -- shared/resources` returns nothing.
`hash-object` appears only as a read (`record-reviewed-blob.js:102`, which hashes a document and
writes nothing).

**The re-review HALT.** One block in three copies: `shared/resources/qa-re-review-scope.md:222`,
`skills/qa-task/SKILL.md:529`, `skills/qa-story/SKILL.md:1015`, each
`DIRTY=$(git status --porcelain --untracked-files=no -- . ":(exclude)$WORK_ITEM_DIR" ":(exclude).claude/state")`.
A non-empty `DIRTY` HALTs with `HALT: uncommitted changes outside the work item`. Untracked files
outside the work item only warn (the `UNTRACKED=` line after it). `$BASE` is bound before the block
(`skills/qa-task/SKILL.md:467`, `BASE="origin/${BASE_REF:-develop}"`) and the block's arms read
`git diff "$BASE...HEAD"` (`:544`). Test E of `shared/resources/tests/qa-scope-from-head.test.mjs:293`
(`the scope block is the same in the shared rule, qa-task and qa-story`) holds the three copies
equal. Tests L4 (`:765`) and L11 (`:826`) assert the HALT on a dirty `skills/b.sh`, which the fixture
commits on its feature branch (`scratch()`, `:153`), so it is in the change set.

### Target Architecture

**`registry-tick.js --stage`.** A flag on all three modes, used by the tick and `--annotate` in this
task. After the working-tree write, and also on `already` (the resume case), it:

1. reads the index copy (`git show :<registry>`) and the index entry's mode (`git ls-files -s`);
2. finds the **same row by its id** in the index text (never by line number, since the index copy may
   have fewer rows than the working file);
3. replaces that row's line with the working file's line, which is the row the engine just wrote;
4. writes the blob (`git hash-object -w --stdin`) and points the index at it (`git update-index
   --cacheinfo <mode>,<hash>,<registry>`).

It reports `staged: true|false` with a `stageReason` in the JSON: `staged`, `already-staged`
(index row already equals the working row), `row-not-in-index` (the row exists only in the working
tree, e.g. never committed), `not-tracked` (the registry is not in the index), `not-a-repo`. A
`stageReason` other than `staged` / `already-staged` never changes the exit code. The registry write
never blocks acceptance (`docs/standards/task-registry.md`), and the drift test
(`evals/shared/tests/task-registry-drift.test.mjs`) is the backstop.

**Callers.** `/finalise` 6a removes its registry `git add` and passes `--stage` to the Step 7.4 call.
`develop-next` and `develop-batch` pass `--stage` to `--annotate` and commit what is staged. The
resume path's `git diff --quiet HEAD --` check becomes `git diff --cached --quiet HEAD --`, because
the working file may differ from HEAD for another session's reasons.

**The re-review HALT.** Split `DIRTY` into two lists:

- **Halts:** a dirty tracked path that is in `git diff --name-only "$BASE...HEAD"`, or whose
  directory (exact `dirname`, not a prefix) holds a file in that list.
- **Warns:** every other dirty tracked path, printed under
  `warning: uncommitted changes outside the review scope are not in this review:` beside the untracked
  warning.

The change set is the whole PR (`$BASE...HEAD`), not the scoped arm's `<gate head>..HEAD` list, so
cycle 2, the safety re-probe and a schema-1 gate use the same rule. If `$BASE...HEAD` cannot be listed
(a missing base ref), the block falls back to today's rule: every tracked dirt HALTs.

### Important Clarifications

- **"Directory" means the exact parent directory.** `docs/tasks/task-registry.md` does not halt
  task.242's review, because its changed files sit in `docs/tasks/task.242.…/`, not in `docs/tasks/`.
  A prefix rule would make `docs/` halt everything.
- **Only `dirname` of changed files, not of new files the fix made.** An untracked file already only
  warns, and that does not change.
- **`--stage` stages the row, not the file.** If the index copy lacks a row the working file has
  (another session's new row), that row stays unstaged. This is the point of the flag.

---

## 4. Scope

### In Scope

✅ `shared/resources/registry-tick.js`: the `--stage` flag on the tick and `--annotate`, and its tests
✅ `/finalise` Step 7.4 call and 6a staging block
✅ `develop-next` Step 4 registry arm (both commit sites) and `develop-batch`'s merge lane prose
✅ The re-review block in `qa-re-review-scope.md`, `qa-task/SKILL.md` and `qa-story/SKILL.md`, and
   its tests in `qa-scope-from-head.test.mjs`
✅ Bundled copies (`npm run bundle`) and the docs that restate either rule

### Out of Scope

❌ **`--bug-status`** (develop-bug, qa-fix). Its write is committed by `develop-bug` Step 8's
   `/commit-changes --scope docs/bugs/bug-registry.md`, a different staging path. The flag is built
   mode-agnostic so a follow-up can adopt it; this task does not change those callers.
❌ **An allowlist flag for the HALT** (obs #126's second option). Keying on the review's input makes
   it unnecessary, and an allowlist is one more thing a caller can get wrong.
❌ **Other whole-file `git add`s** outside the registry (roadmap ticks in `develop-next` /
   `develop-batch`). The roadmap is one session's file at a time by `develop-next`'s design.
❌ `commit-changes --scope` (already fixed by task.128).

---

## 5. Breaking Changes

### A tracked edit outside the review scope no longer HALTs a re-review

**Before:** any tracked change outside the work item and `.claude/state` HALTs the re-review.
**After:** only one in the PR's change set or beside a changed file HALTs; the rest is a warning.

**Impact:** an uncommitted fix to a file the PR has not yet touched, in a directory it has not
touched, is reviewed as absent with a warning instead of a HALT.

**Migration path:** none is needed for callers. The warning names the path, and the QA report records
it. A developer who sees their own fix in the warning commits it and re-runs the cycle.

No other breaking change: `--stage` is opt-in, and callers that do not pass it behave as today.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.245.plan.shared-checkout-safe-guards-and-staging.md](task.245.plan.shared-checkout-safe-guards-and-staging.md)

### Phase 1: `registry-tick.js --stage` (Risk: Medium)

**Files:** `shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`

- [x] Parse `--stage` for every mode; reject it with `--dry-run` (usage error, exit 2)
- [x] After a `ticked` / `annotated` write, and on `already`, stage the row as § 3 describes
- [x] Report `staged` and `stageReason`; exit code unchanged by any `stageReason`
- [x] Tests in a scratch repository: other edits stay unstaged; row located by id when the index has
      fewer rows; each `stageReason`; idempotent on a second run

**Dependencies:** none.

### Phase 2: Registry callers (Risk: Medium)

**Files:** `skills/finalise/SKILL.md`, `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`

- [x] `/finalise` 7.4 passes `--stage`; 6a's registry `git add` block is removed; a `stageReason`
      other than `staged` / `already-staged` is logged in the DoD file
- [x] `develop-next` Step 4: `--annotate --stage`; both `git add docs/tasks/task-registry.md` removed;
      the resume check reads the index (`git diff --cached --quiet HEAD --`)
- [x] `develop-batch` merge lane: same change in its prose
- [x] A new executed test of the 6a block: a parallel row in the working file is absent from the
      commit. The only test today that slices 6a is `evals/shared/tests/finalise-bug-mode.test.mjs`
      (to the `--- acceptance artefacts resolved ---` marker, before the registry add), so this case
      is new, not an update

**Dependencies:** Phase 1.

### Phase 3: Re-review HALT keyed on the review's input (Risk: High)

**Files:** `shared/resources/qa-re-review-scope.md`, `skills/qa-task/SKILL.md`,
`skills/qa-story/SKILL.md`, `shared/resources/tests/qa-scope-from-head.test.mjs`

- [x] Split `DIRTY` into halts and warns as § 3 describes, identically in the three copies
- [x] Fall back to today's rule when `$BASE...HEAD` cannot be listed
- [x] L4 and L11 stay green unchanged (their file is in the change set)
- [x] New tests: a dirty file outside the change set and its directories warns and the review runs;
      a dirty file beside a changed file HALTs; an unlistable base HALTs as today
- [x] Test E still holds the three copies equal

**Dependencies:** none (independent of Phases 1–2).

### Phase 4: Bundle and doc sweep (Risk: Low)

- [x] `npm run bundle`; `npm run bundle:check` clean
- [x] Sweep docs that restate either rule (`grep -rn 'uncommitted changes outside the work item'`,
      `grep -rn 'git add docs/tasks/task-registry.md'`) and update each
- [x] CHANGELOG entry citing `(task 245)`

**Dependencies:** Phases 1–3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/registry-tick.js`: `--stage`
2. ✅ `shared/resources/qa-re-review-scope.md`: the HALT split (canonical copy)
3. ✅ `skills/qa-task/SKILL.md`: the same block
4. ✅ `skills/qa-story/SKILL.md`: the same block
5. ✅ `skills/finalise/SKILL.md`: Step 7.4 call, 6a staging
6. ✅ `skills/develop-next/SKILL.md`: Step 4 registry arm
7. ✅ `skills/develop-batch/SKILL.md`: merge lane

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/registry-tick.test.mjs`
9. ✅ `shared/resources/tests/qa-scope-from-head.test.mjs`
10. ✅ `shared/resources/tests/finalise-6a-registry-staging.test.mjs` (new: executes 6a with a parallel registry row)

### Files to Modify (Documentation and generated)

11. ✅ `CHANGELOG.md`
12. ✅ `skills/*/references/registry-tick.js`, `skills/*/references/qa-re-review-scope.md` (regenerated by `npm run bundle`)

The call-site population for § 3's table was measured with the two `git grep` commands there, not
recalled. `registry-tick` is not one of `call-sites.js`'s engines.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `registry-tick.js --stage` in a scratch git repository.
- **Actions:** a registry with a committed row for the document plus an uncommitted extra row and a
  bumped counter; run the tick with `--stage`; assert `git diff --cached` holds only the ticked row and
  `git diff` still holds the extra row and counter. Repeat for `--annotate`. One case per
  `stageReason`. A second run answers `already` / `already-staged` and changes nothing.
- **Command:** `command node --test shared/resources/tests/registry-tick.test.mjs`

### Integration Tests

- **Scope:** the re-review block, executed under bash and zsh by `qa-scope-from-head.test.mjs`.
- **Actions:** the three new cases in Phase 3, plus L4/L11 unchanged.
- **Command:** `command node --test shared/resources/tests/qa-scope-from-head.test.mjs`

**Mutation proofs (each must go red with the fix reverted):**

- Restore `git add docs/tasks/task-registry.md` in the 6a test harness: the parallel-row case fails.
- Stage by line number instead of row id: the fewer-rows-in-index case fails.
- Replace the halts/warns split with "warn on everything": L4 and L11 fail.
- Use a prefix match instead of exact `dirname`: the outside-the-change-set case fails, because
  `docs/` contains every changed doc.

### Control case

The motivating incident is a registry edit. The HALT tests must also use a dirty file that is not a
registry and not a `docs/` file (for example `scripts/other.sh` beside no changed file), so a pass
does not depend on the example.

### Performance Tests

Not applicable. `--stage` adds three git subprocess calls per registry write.

### Consumer Tests

`npm run ci` (format check, `npm test`, `eval:all`), with the gitignored `.agents/skills` symlink
moved aside first so bundled copies are what runs.

---

## 9. Success Criteria

### Functional

- [ ] SC-1: `registry-tick.js --stage`, run on a registry whose working file holds the document's
      row and an unrelated uncommitted row, leaves the index with only the document's row changed
      and the unrelated row unstaged (Phase 1).
- [ ] SC-2: `--stage` finds the row by id when the index copy has fewer rows than the working file
      (Phase 1).
- [ ] SC-3: every `stageReason` other than `staged` / `already-staged` exits 0 (Phase 1).
- [ ] SC-4: `/finalise` 6a has no `git add docs/tasks/task-registry.md`, and an executed 6a run with
      a parallel registry row commits the acceptance without it (Phase 2).
- [ ] SC-5: `develop-next` and `develop-batch` commit the `--annotate` row with `--stage` and no
      whole-file add; the resume path reads the index (Phase 2).
- [ ] SC-6: a re-review with a dirty tracked file outside the change set and its directories
      prints the warning and continues to dispatch (Phase 3).
- [ ] SC-7: a re-review with a dirty tracked file in the change set, or beside a changed file, HALTs
      as today (Phase 3; L4, L11 and the new beside-a-changed-file case).
- [ ] SC-8: when `$BASE...HEAD` cannot be listed, every tracked dirt HALTs (Phase 3).

### Performance

- [ ] SC-9: `npm test` wall time is within 5% of `develop` (no new slow suite).
- [ ] SC-10: `--stage` adds no network call.

### Code Quality

- [ ] SC-11: each mutation proof in § 8 goes red with its fix reverted, recorded in the
      implementation report.
- [ ] SC-12: `npm run ci` passes; `npm run bundle:check` is clean; test E holds the three copies
      equal.
- [ ] SC-13: `npm run validate -- skills/finalise/ skills/develop-next/ skills/develop-batch/
      skills/qa-task/ skills/qa-story/` passes.

### Migration

- [ ] SC-14: CHANGELOG entry cites `(task 245)`.
- [ ] SC-15: every doc the Phase 4 greps return is updated or listed as unaffected in the
      implementation report.

---

## 10. Risk Assessment

### High Risk Areas

1. **Loosening a safety HALT.**
   - **Risk:** an uncommitted fix to a file in a directory the PR has not touched is reviewed as
     absent, with only a warning.
   - **Probability:** Low. A fix normally lands in a file the PR changed or beside one.
   - **Impact:** High. A gate could PASS code it did not read.
   - **Mitigation:** the warning names the path, and the QA report must record it; mutation proof
     for the split; fail-closed fallback when the change set cannot be listed.
   - **Rollback:** revert Phase 3 alone (§ 11).

### Medium Risk Areas

1. **Staging the wrong row.**
   - **Risk:** `--stage` writes a row into the index that the working file's row does not match, or
     a malformed blob.
   - **Probability:** Low. **Impact:** Medium (a wrong registry line committed).
   - **Mitigation:** locate by id; the drift test compares document and row on every push; tests
     assert the staged blob byte for byte.
2. **Three copies of the HALT drifting.**
   - **Mitigation:** test E already fails on drift.

### Low Risk Areas

1. **Prose callers missing a site.** The § 3 population command is re-run in Phase 4.
2. **`git update-index` on a sparse or unusual index.** It is the same command the manual workaround
   used on 2026-10-29.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a registry commit carries a wrong row; a QA cycle PASSes with an uncommitted fix that
  the warning named.
- **Steps:** `git revert <merge commit>`; `npm run bundle`; commit; push.
- **Validation:** `npm test` green; 6a shows `git add docs/tasks/task-registry.md` again.

### Partial Rollback (1-2 hours)

- **When to use:** only one half misbehaves.
- **Steps:** revert Phase 3's commits (the HALT) or Phases 1–2's (staging) alone. They are
  independent.

### Forward Fix

- **When to use:** a `stageReason` case not covered, or a doc that still restates the old rule.
- **Approach:** fix forward with a test.

### Rollback Triggers

- **Critical:** any commit containing another session's registry row; any PASS on unread code.
- **Non-critical:** a misleading warning text; a missed doc restatement.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-30
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.245.qa.4.shared-checkout-safe-guards-and-staging.md](./task.245.qa.4.shared-checkout-safe-guards-and-staging.md)
- **Gate File**: [task.245.gate.4.shared-checkout-safe-guards-and-staging.yml](./task.245.gate.4.shared-checkout-safe-guards-and-staging.yml)

### Test Coverage Summary
- **Tests Executed**: 6910
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
T245-QA-4 is fixed. The scoped review found one medium defect: the develop-batch stageReason gate and its closing tick sentence disagree for the not-attempted exits (T245-QA-5).

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-10-29 | 1.0     | Initial draft — cut from observations #126, #127  | create-task |
| 2026-10-30 | 1.1     | Review passed (10/10) — ready for development     | review-task |
| 2026-10-30 |         | Status → ready-for-development                    | review-task |
| 2026-10-30 |         | Implemented — 13 files, 22 tests added            | develop     |
| 2026-10-30 |         | QA gate CONCERNS (90/100) — 1 finding             | qa-task     |
| 2026-10-30 |         | QA findings fixed — cycle 1, 1 finding            | qa-fix      |
| 2026-10-30 |         | QA gate CONCERNS (80/100) — 2 findings            | qa-task     |
| 2026-10-30 |         | QA findings fixed — cycle 2, 2 findings           | qa-fix      |
| 2026-10-30 |         | QA gate CONCERNS (90/100) — 1 finding             | qa-task     |
| 2026-10-30 |         | QA findings fixed — cycle 3, 1 finding            | qa-fix      |
| 2026-10-30 |         | QA gate CONCERNS (90/100) — 1 finding             | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: `registry-tick.js --stage`
- [x] Phase 2: Registry callers
- [x] Phase 3: Re-review HALT keyed on the review's input
- [x] Phase 4: Bundle and doc sweep

---

## References

- Observation #126 — qa-task re-review dirty-tree HALT cannot tell a parallel session's edit from an uncommitted fix
- Observation #127 — finalise 6a stages the whole task registry, sweeping a parallel session's uncommitted rows into the acceptance commit
- obs #142 / task.128: the same whole-tree-staging shape, fixed in `commit-changes --scope`.
- task.168 CR3-7: why the re-review HALT exists.

## Notes

- Phases 1–2 and Phase 3 are independent and could be reverted separately; they ship as one task
  because they share one rule (a guard or a write keys on what this session owns), and the user asked
  for one task.
- QA artifacts will land beside this document: `task.245.qa.{N}.shared-checkout-safe-guards-and-staging.md`,
  `task.245.gate.{N}.shared-checkout-safe-guards-and-staging.yml`, and `task.245.bug.{N}.*.md` for any
  bugs.
