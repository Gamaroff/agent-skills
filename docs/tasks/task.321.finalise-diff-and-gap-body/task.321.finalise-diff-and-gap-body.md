---
id: task.321
title: "finalise's diff fallback is one commit, and its gap body leaks a marker"
type: task
description: "Give /finalise one reader for the PR's whole change that names its source and refuses to answer with less, and end the gap report's body at the change-log marker."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-25
updated: 2026-11-28
estimated_effort_hours: 8
github_issue: 941
---

# Technical Task: finalise's diff fallback is one commit, and its gap body leaks a marker

**GitHub Issue**: [#941](https://github.com/Gamaroff/agent-skills/issues/941)

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.321.review.1.finalise-diff-and-gap-body.md` implemented 2026-11-28

---

## 1. Overview

`/finalise` hands its acceptance agents a diff. When the forge does not give one, the skill uses the
last commit instead, says nothing, and exits 0. This task replaces both reads with one script that
reads the whole change and names where it came from. It also stops `dod-gap-count.sh --body` from
printing a change-log marker.

**Scope**: one new script, `/finalise` Steps 3a and 3e, three agent prompts, `dod-gap-count.sh`, and
the tests.

**Key deliverables:**

- `finalise-diff.sh` writes the whole change, or exits 1 with a reason and an empty file;
- the running summary records which diff was used, and what it left out;
- a criterion over a set cannot pass on an empty diff;
- the gap report's body ends at the change-log marker.

**Expected outcome**: no acceptance is graded on part of a change that reads as the whole.

---

## 2. Motivation

### Current Problems

1. **The fallback is one commit.** Step 3a runs `gh pr diff`, then `git diff HEAD~1 HEAD`. On PR #937
   the forge refuses the diff (`PullRequest.diff too_large`). The fallback then gives 1 file where the
   change has 250 (§ 3).
2. **It is silent.** Both commands send stderr to `/dev/null`, and nothing in the running summary says
   which one answered. Any other failure of `gh`, such as a network error, takes the same route.
3. **On Bitbucket it is every run.** `gh pr diff` cannot read a Bitbucket pull request, so each run
   there is graded on its last commit.
4. **An empty diff can pass a criterion.** The AC agent's quantifier rule lists the members from
   `<DIFF_FILE>` and passes when no member is unmapped. With no members, no member is unmapped.
5. **The gap body leaks a marker.** `dod-gap-count.sh --body` ends at the next `## ` heading. The
   change-log marker stands above the `## Change Log` heading, so the marker goes into the PR comment.

### Benefits of Solution

1. The agents see every changed file, on both forges, at any size.
2. A reader of the DoD can see which diff was graded.
3. "Could not read the diff" and "the diff is small" are different answers.
4. The gaps comment on the PR holds the report and nothing else.

---

## 3. Technical Background

Every name below was grepped or run at `6f6c67aad` (v0.69.0).

### Current Architecture

- **The diff.** `skills/finalise/SKILL.md:529-531` *(`DIFF_FILE=".claude/state/pr-diff-…`)*: `gh pr
  diff "$PR_NUMBER"`, else `git diff HEAD~1 HEAD`, else `touch`. Step 3e *(`rm -f "$DIFF_FILE"`,
  `:1345`)* removes it.
- **Its readers.** Three prompts: `finalise-dod-ac-prompt.md:56` and `:61`,
  `finalise-dod-docs-prompt.md:59`, `finalise-dod-fix-evidence-prompt.md:49`. Command:
  `grep -n 'DIFF_FILE' skills/finalise/SKILL.md shared/resources/finalise-dod-*-prompt.md`.
- **The PR's base and head.** `pr-read.sh` sets `PR_READ_BASE` and `PR_READ_HEAD` on both forges.
- **The gap body.** `dod-gap-count.sh` *(`!infence && s && /^## / { s = 0 }`)* closes the section at
  the next level-2 heading only.

### Other code that does this job

| Where | What it does | Relation |
| :-- | :-- | :-- |
| `review-pr` Step 4 | `git diff base...head`, then the forge; excludes `*/references/*` by path | **Beside.** Same order. It is prose for a reviewer, and it carries a rule about the author's intent (obs #33) that a script cannot apply |
| `finalise-delta.js` *(`merge-base`)* | changed **names** only, for the fix-and-recheck route | **Beside.** It has no patch |
| `qa-results.js` *(`RE_STRUCTURAL`)* | treats every change-log marker as the end of a section | **The precedent** for the gap body |

### The measurements

| Read of PR #937 (`a511895a0`, `b5057a5d2`) | Files | Patch lines |
| :-- | --: | --: |
| `gh pr diff 937` | refused, exit 1 | |
| `git diff HEAD~1 HEAD` (today's fallback) | 1 | 74 |
| merge base to head | 250 | 38,067 |
| the same, without 76 bundled copies | 174 | 24,934 |

**A path pattern is the wrong exclusion.** `git ls-files 'skills/*/references/*'` lists 1,314 files.
97 of them have no source in `shared/resources/`: they were written by hand. A pattern over
`references/` would hide those. The header alone is wrong too: two JSON copies carry none. A bundled
copy is a file under `skills/<skill>/references/` whose relative path exists under
`shared/resources/`.

### Target Architecture

`shared/resources/finalise-diff.sh --out <file> [--pr <n>]` writes two files and prints one line.

1. `pr_read` gives the base and the head. No PR, or a failed read → `unresolved`.
2. The PR's head commit is here, wherever `HEAD` is: fetch the base, then `git diff <merge-base> <head>`
   without the bundled copies. `source=merge-base`. A bundled copy is looked up in the head's tree.
3. It is not here, or it adds nothing to the base (a merged PR), and the forge is GitHub: `gh pr diff`.
   `source=forge`.
4. Otherwise: `unresolved`, with the reason.

`<file>` holds the patch. `<file>.names` holds **every** changed path, the excluded copies included, so
a criterion about the copies has its members. An empty result is `unresolved`, never a patch.

`unresolved` empties `<file>`, exits 1 and prints why. `/finalise` goes on, as it does today with no
diff, but it records the reason, and the agents are told.

### What was tried, and what was not

| Remedy | Run at | Result |
| :-- | :-- | :-- |
| the reader, steps 2 and the empty result | `b5057a5d2` against `a511895a0` | 250 names, 76 excluded, 174 in the patch, 2 of them hand-written `references/` files |
| the same on a merged head | `a511895a0` against itself | `unresolved: no change between …` |
| the marker rule | a scratch clone | no marker for the current and both legacy pairs; a fenced marker is kept; the count is unchanged; `finalise-gaps-path.test.mjs` 41 of 41 |

**Not exercised**: the `pr_read` call, the fetch, and the forge arm. The plan's tests drive them.

**The corpus cannot hold the marker rule.** 39 tracked files match
`git grep -l '^## Definition of Done - Gaps Identified' -- 'docs/**/*.md'`. None prints a marker before
or after the change, because an accepted document's gap section is historical. The test builds its own
document.

---

## 4. Scope

### In Scope

✅ `finalise-diff.sh`, and Steps 3a and 3e of `/finalise` (story, task and bug modes)

✅ The three prompts that read `<DIFF_FILE>`

✅ `dod-gap-count.sh`, the body and the count

### Out of Scope

❌ **Observation #170.** The change-log marker stands above the heading because
`document-change-log.md` § Markers requires it. Declined (§ Notes).

❌ **`review-pr` Step 4.** Its read is right, and its exclusion carries a rule about the author's intent.

❌ **A PR diff after the merge on Bitbucket.** It reads `unresolved`, and says so.

❌ **The `gh pr view` calls inside the prompts.** A Bitbucket run still reads `NOT_FOUND` there.

---

## 5. Breaking Changes

None - API stable. `/finalise` takes the same arguments. The agents' patch no longer holds bundled
copies, and their names stay in the list beside it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.321.plan.finalise-diff-and-gap-body.md](task.321.plan.finalise-diff-and-gap-body.md)

### Phase 1: The diff reader

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-diff.sh` (new)
- `shared/resources/tests/finalise-diff.test.mjs` (new)

**Changes**:
- [x] Write the failing cases first (§ 8), each in a temporary repository with a stub `gh`
- [x] Write the script: four steps, two output files, one line, bash and zsh
- [x] Exclude a bundled copy by its source, never by a path pattern or a header

**Dependencies**: None

### Phase 2: `/finalise` uses it

**Risk Level**: Medium

**Files**:
- `skills/finalise/SKILL.md`
- `shared/resources/finalise-dod-ac-prompt.md`
- `shared/resources/finalise-dod-docs-prompt.md`
- `shared/resources/finalise-dod-fix-evidence-prompt.md`

**Changes**:
- [x] Step 3a calls the script, and the Step 2 block of the running summary gains a `**PR diff:**` line
- [x] Step 3e removes both files
- [x] The AC prompt takes members from the names list, and an empty list fails a criterion over a set
- [x] The docs and fix-evidence prompts say what an empty diff means, in each prompt's own status
      words: a check that needs the diff is `FAIL`, with the note "the change could not be read".
      Neither contract has a `NEEDS_MANUAL_REVIEW` token (`PASS | FAIL | NOT_APPLICABLE` in both), and
      `NOT_APPLICABLE` would read as nothing to check
- [x] The fix-evidence prompt's check 5 ("bundled copies match the source",
      `finalise-dod-fix-evidence-prompt.md:68-69`) reads the copies from `<DIFF_FILE>.names`: the patch
      no longer holds them, so reading the patch would fail every bug fix that touches `shared/resources/`

**Dependencies**: Phase 1

### Phase 3: The gap body

**Risk Level**: Low

**Files**:
- `shared/resources/dod-gap-count.sh`
- `shared/resources/tests/finalise-gaps-path.test.mjs`

**Changes**:
- [x] Write the failing cases first
- [x] End the section at an unfenced change-log marker, current or legacy
- [x] Add a parity test: the script's markers are the ones `change-log.js` exports

**Dependencies**: None

### Phase 4: Records and bundle

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [x] Write the CHANGELOG entry
- [x] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 to 3

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/finalise-diff.sh` - the one reader of the PR's change
2. ✅ `shared/resources/tests/finalise-diff.test.mjs` - drives the script

### Files to Modify (Core Implementation)

3. ✅ `skills/finalise/SKILL.md` - Steps 3a and 3e
4. ✅ `shared/resources/finalise-dod-ac-prompt.md` - the members, the empty diff
5. ✅ `shared/resources/finalise-dod-docs-prompt.md` - the empty diff
6. ✅ `shared/resources/finalise-dod-fix-evidence-prompt.md` - the empty diff
7. ✅ `shared/resources/dod-gap-count.sh` - the end of the section

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/finalise-gaps-path.test.mjs` - the marker cases
9. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` - the AC prompt's rule, the empty-diff
   sentences, and fix-evidence check 5 reading the names list

### Tests that pin the touched documents (read before editing)

Found by file name, not by literal:
`git grep -ln 'finalise-dod-ac-prompt\|finalise-dod-docs-prompt\|finalise-dod-fix-evidence-prompt\|dod-gap-count' -- '*.test.*'`.
Each reads one of the files above by pattern and may need no change; read it for a structural pin
before the edit.

- `evals/shared/tests/finalise-bug-mode.test.mjs`, `finalise-publish-boundary.test.mjs`,
  `finalise-rerun-scope-blocks.test.mjs`, `qa-measured-figure-parity.test.mjs`
- `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `qa-finalise-rules-wiring.test.mjs`,
  `resolve-pr-number.test.mjs`, `zsh-flag-expansion-guard.test.mjs`
- `tests/explore-prompts-no-write.test.js`, `review-plan-shape-checks.test.js`,
  `review-task-measured-criterion.test.js`

Two constraints follow. `finalise-rerun-scope-blocks.test.mjs` asserts that exactly one bash fence holds
each of its needles, so the new Step 3a fence must not contain `finalise-rerun-scope.js scope`.
`explore-prompts-no-write.test.js` refuses a write redirect in an Explore prompt, so the prompts read the
names list (`tr '\0' '\n' < <DIFF_FILE>.names`) and never write it. The literal search
(`git grep -n 'HEAD~1 HEAD\|gh pr diff\|pr-diff-' -- '*.test.*'`) finds one hit,
`skills/review-pr/tests/review-pr.test.js:409`, which pins `review-pr` Step 4 and is out of scope.

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`

### Generated

11. ✅ `skills/*/references/` copies of 1 and 4 to 7, by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| A branch of three commits, the PR head is `HEAD` | the forge's diff, or the last commit | all three, `source=merge-base` |
| `gh` fails (stub exits 1) on that branch | the last commit, exit 0 | unchanged: the forge is not asked |
| A Bitbucket remote | the last commit, exit 0 | `source=merge-base` |
| The PR is merged and the checkout is the base, GitHub | the forge's diff | `source=forge` |
| The same, and `gh` fails | the last commit of the base | `unresolved`, exit 1, empty file |
| No PR | the last commit | `unresolved`, exit 1 |
| The branch adds nothing, and the forge's diff is empty | an empty file, exit 0 | `unresolved`, exit 1 |
| The PR is open, and the checkout is on another branch that has its head commit | the forge's diff, or another branch's last commit | `source=merge-base`, of the PR's head |
| A bundled copy and a hand-written `references/` file change | both, or neither | the second in the patch, both in the names |
| A repository with no `shared/resources/` | all files | all files |
| A path with a space, a quote or a newline | as git prints it | in the names list, NUL-delimited |
| A change to a `shared/resources/` file and its bundled copy, read by fix-evidence check 5 | the copy is in the patch | the copy is in the names list, and the prompt reads it there |
| Base branch name absent on the remote | the last commit | `unresolved`, with the fetch's reason |

| Gap body | Today | After |
| :-- | :-- | :-- |
| The current marker above the heading | printed | not printed |
| Each legacy marker | printed | not printed |
| A fenced marker inside the section | printed | printed |
| The count of each of these documents | N | N |

**Command**: `command node --test shared/resources/tests/finalise-diff.test.mjs shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Temporary directories**: a shared helper removes each one in `t.after`.

### Consumer Tests

`npm run test:remote` runs the whole suite. The Step 3a block is extracted from `SKILL.md` and run in
bash and zsh, as `finalise-rerun-scope-blocks.test.mjs` does for its neighbours.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the two § 8 tables holds in a test that drives the script
- [ ] No block in `skills/finalise/SKILL.md` runs `git diff HEAD~1 HEAD`
- [ ] The Step 3a block writes a `**PR diff:**` line for each of `merge-base`, `forge` and `unresolved`
- [ ] The AC prompt fails a criterion over a set when the names list is empty, held by
      `finalise-dod-prompt-contract.test.mjs`
- [ ] The docs and fix-evidence prompts report an empty diff as `FAIL` with "the change could not be
      read", and fix-evidence check 5 reads `<DIFF_FILE>.names`, held by `finalise-dod-prompt-contract.test.mjs`

### Performance

- [ ] Not applicable: one `git diff` replaces one forge call

### Code Quality

- [ ] Reverting the exclusion rule, the empty-result rule and the marker rule, each alone, turns a named test red (recorded in the QA report)
- [ ] `npm run test:remote` passes
- [ ] `npm run bundle:check` passes, and `shellcheck` passes on the new script
- [ ] `npm run validate -- skills/finalise/` passes

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` names the change

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

#### 1. The local base is old

**Risk**: a stale `origin/<base>` gives an older merge base, so the diff holds other merged work
**Probability**: Medium
**Impact**: Medium
**Mitigation**: the script fetches the base first, and a failed fetch is named in the line it prints

#### 2. A real change is excluded

**Risk**: the subject of a PR is a bundled copy
**Probability**: Low
**Impact**: Medium
**Mitigation**: a copy cannot differ from its source past `bundle:check`, the source is in the patch, and the copy's name is in the list

### Low Risk Areas

#### 1. A consumer's own `shared/resources/`

**Risk**: a consumer has that directory and a hand-written file of the same name under `references/`
**Probability**: Low
**Impact**: Low
**Mitigation**: its name stays in the list, and the line says how many were excluded

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: `/finalise` stops at Step 3a, or the agents report no changed files on a normal PR

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: run the Step 3a block on a branch with an open PR and read the diff file

### Partial Rollback (1-2 hours)

Phase 3 stands alone and can stay. Phases 1 and 2 revert together.

### Forward Fix (< 4 hours)

A wrong reason text, or a missing line in the running summary, is fixed forward.

### Rollback Triggers

**Critical**: an accepted run whose diff was `unresolved` and unrecorded

**Non-critical**: wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-28
**Quality Score**: 96/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.321.qa.3.finalise-diff-and-gap-body.md](./task.321.qa.3.finalise-diff-and-gap-body.md)
- **Gate File**: [task.321.gate.3.finalise-diff-and-gap-body.yml](./task.321.gate.3.finalise-diff-and-gap-body.yml)

### Test Coverage Summary
- **Tests Executed**: 133 in the three task suites; 9055 in `ci:fast`
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- T321-CR-201 fixed: the AC and fix-evidence agents now receive `<DIFF_LINE>`, and the DoD's Step 2 block records it.
- T321-CR-202 fixed: the merge-base patch ignores host git colour and prefix config.
- Three low test-coverage cleanups recorded as future work.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                     | Author      |
| ---------- | ------- | ----------------------------------------------- | ----------- |
| 2026-11-25 | 1.0     | Initial draft — cut from observation #178       | create-task |
| 2026-11-28 | 1.1     | Review passed (8/10) — prompts use their own status words, fix-evidence check 5 reads the names list, pattern-pinning tests listed | review-task |
| 2026-11-28 |         | Status → ready-for-development                  | review-task |
| 2026-11-28 |         | Implemented — 17 files, 21 tests                | develop     |
| 2026-11-28 |         | QA gate CONCERNS (90/100) — 2 findings          | qa-task     |
| 2026-11-28 |         | QA findings fixed — 2 of 2, 1 iteration         | qa-fix      |
| 2026-11-28 |         | QA gate CONCERNS (90/100) — 2 findings          | qa-task     |
| 2026-11-28 |         | QA findings fixed — 2 of 2, 1 iteration         | qa-fix      |
| 2026-11-28 |         | QA gate PASS (96/100) — 0 findings              | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The diff reader

- [x] Failing cases (written beside the script, not before it; each rule mutation-proven instead — see the implementation report)
- [x] Script
- [x] Exclusion

### Phase 2: `/finalise` uses it

- [x] Steps 3a and 3e
- [x] AC prompt
- [x] Docs and fix-evidence prompts

### Phase 3: The gap body

- [x] Failing cases
- [x] Marker rule
- [x] Parity test

### Phase 4: Records and bundle

- [x] CHANGELOG
- [x] Bundle

---

## Implementation Summary

**Completion Date**: 2026-11-28

**Approach**: the plan's script and hunks, implemented inline. `finalise-diff.sh` reads the PR with
`pr-read.sh`, resolves its head to a full commit, fetches the base, and diffs the merge base against
that head. A `skills/*/references/` path whose relative path exists under `shared/resources/` in the
head's tree is excluded from the patch and kept in `<file>.names`. When the head is not in the
checkout, or adds nothing, the script asks `gh pr diff` (GitHub only) and takes the names from the
`diff --git` headers. Otherwise it prints `unresolved: <reason>` and empties both files. Step 3a
calls it through an argument array (for zsh) and records the line it prints. `dod-gap-count.sh` gains
one awk rule after the `## ` rule.

Beyond the plan: an executed-prose case cuts Step 3a's diff lines out of `SKILL.md` and runs them in
bash and zsh. The source directory is held in `SRC_DIR` because the literal path read to the bundler
as a file to bundle.

**Testing Results**: `npm run test:remote` (`ci:fast` on the LAN server): 9045 tests, 9042 pass,
0 fail, 3 skipped. The first run stopped at `format:check` (three new test files unformatted) and was
re-run after `prettier --write`. The three task suites: 123 of 123. `bundle:check`: 0 problems.
`lint:shell`: clean. `validate skills/finalise/`: passes. Phase 3's cases were red before the rule.
Phase 1's were written after the script, so each rule was mutation-proven instead: the exclusion
lookup, the empty-patch rule, the forge-arm empty check, the marker rule and its fence guard. Each
was reverted alone and turned a named test red. They are listed in the implementation report.

## Deferred Work

None.

---

## References

- Observation #178 — finalise's diff fallback is one commit, and its gap body leaks a marker
- Observation #170 — declined, see Notes
- [Task 222](../task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md), the gap-section reader
- [Task 319](../task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md), the run both were seen on
- [Document Change Log](../../../shared/resources/document-change-log.md)

---

## Notes

**Observation #170 is not in this task.** It asked for the change-log writer to keep the marker below
the heading. The contract says the heading lives inside the markers (obs #104, task 127), the task
template writes it that way, and `change-log.test.mjs` holds the rebuild and the canonical header. 189
of the 204 task documents that have both put the marker first. Task 306, where it was seen, is one of
the other 15. The blank line the writer also removed was inside that document's table.

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
