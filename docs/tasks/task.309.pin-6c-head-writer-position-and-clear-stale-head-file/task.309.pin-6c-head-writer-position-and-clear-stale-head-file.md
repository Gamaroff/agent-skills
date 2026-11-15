---
id: task.309
title: "Pin the 6c head writer position and clear the stale head file"
type: task
description: "Follow-up to task.308: a test pins where the 6c recorded-head writer sits relative to the poll launch, and 6c clears the head file beside the result and pid files so a later turn cannot read a previous run's head."
tags: [finalise, ci, tests, pipeline]
category: testing
status: ready-for-review
priority: Low
created: 2026-11-15
updated: 2026-11-15
estimated_effort_hours: 2
github_issue: 908
---

# Technical Task: Pin the 6c head writer position and clear the stale head file

**Status:** Ready for Review

**GitHub Issue**: [#908](https://github.com/Gamaroff/agent-skills/issues/908)

Follow-up to [task.308](../task.308.pause-commits-cancel-the-step-7-ci-poll/task.308.pause-commits-cancel-the-step-7-ci-poll.md) (PR #907, merged 2026-11-15). Both items were advisory findings of its QA gate 2 and DoD ("Future recommendations") and were left out of scope there.

---

## 1. Overview

Task 308 made `/finalise` 6c record the acceptance head in `.claude/state/finalise-ci-head-2.txt` before it launches the CI poll, and made the later-turn reader take the head from that file. This task closes the two loose ends in that mechanism: the test does not say where the writer line sits, and nothing removes the file when the next run starts.

**Scope**: one test (`evals/shared/tests/finalise-publish-boundary.test.mjs`) and the 6c poll block in `skills/finalise/SKILL.md`. Nothing else changes behaviour.

---

## 2. Motivation

### Current Problems

1. **The writer's position is unpinned.** The writer test asserts there is exactly one writer line and that it writes the head. It does not assert the line comes before the `nohup bash "$POLL"` launch. A later edit that moves the line below the launch keeps every test green, yet leaves a window where a poll is running and the head is unrecorded.
2. **A previous run's head file survives into the next run.** The block clears `$RESULT` and `$PIDFILE` before launch (`rm -f "$RESULT" "$PIDFILE"`) but not the head file. If a run's 6c block aborts between that `rm` and the writer, a later turn reads the previous run's head and compares it to a result the new poll wrote, or HALTs with a misleading message.
3. **Both facts are advisory findings in a closed task.** They sit in task.308's DoD and QA 2 report and nowhere else a future session will look.

### Benefits of This Task

1. **The writer's place is held by a test.** Moving it past the launch turns a test red.
2. **A stale head cannot be read.** After the change a missing head file means "this run recorded none", and the existing reader HALT fires with its existing message.
3. **No behaviour change on the happy path.** The writer still runs before the launch; the poll and the reader are untouched.

---

## 3. Technical Background

### Current Architecture

All names below were grepped on 2026-11-15 from the repository root.

- The 6c poll block clears the result and pid files, then records the head, then launches the poll: `skills/finalise/SKILL.md:2269` (`rm -f "$RESULT" "$PIDFILE"`), `:2274` (`printf '%s\n' "$CI_HEAD_2" > .claude/state/finalise-ci-head-2.txt`), `:2276` (`nohup bash "$POLL" …`).
- The later-turn reader takes the head from the file and HALTs when it is empty: `skills/finalise/SKILL.md:2297` (`CI_HEAD_2=${CI_HEAD_2:-$(cat .claude/state/finalise-ci-head-2.txt 2>/dev/null)}`) and `:2299` (the HALT).
- The writer test is `evals/shared/tests/finalise-publish-boundary.test.mjs:620` (`6c poll block records the acceptance head it starts on, for the later turn to read`). It extracts the 6c section with `between(...)`, filters `codeLines(sixC)` for the writer line, asserts exactly one, and runs that line in a scratch repository (`:627`–`:660`).
- `rm -f "$RESULT" "$PIDFILE"` is the only place those two files are removed (`grep -n 'rm -f' skills/finalise/SKILL.md`: `:741`, `:772`, `:1236`, `:2269`; only `:2269` is in 6c). The head file is never removed.
- `skills/finalise/SKILL.md` is a source, not a bundled copy; `shared/resources/finalise-ci-poll.sh` is untouched by this task.

### Target Architecture

- The `rm -f` line also names the head file, and it stays above the writer: clear all three, then record the head, then launch.
- The writer test also asserts the order **rm line < writer line < launch line** inside the 6c poll block, by line index in `codeLines(sixC)`.
- A second test runs the shipped `rm` line over a scratch state directory holding a stale head file and asserts the file is gone.

### Important Clarifications

- **Where the clear goes, and why not after the later-turn read.** Clearing after the read would make a second read in a later turn HALT ("not recorded"), and a context compaction can cause exactly that second read. Clearing at the next run's start, beside the two files that already clear there, removes only what a new run is about to replace.
- **The two items are one task.** The seam test (independently shippable, revertible and valuable) fails for each alone: the position test pins a line whose neighbouring `rm` the second item adds, and both edit the same six lines. Splitting by file touched is the anti-pattern the skill names.

---

## 4. Scope

### In Scope

✅ **The writer position test**: order rm < writer < launch in the 6c poll block.
✅ **The stale-file clear**: the head file joins `$RESULT` and `$PIDFILE` in the existing `rm -f`.
✅ **A test of the clear** that runs the shipped line.
✅ **`CHANGELOG.md`**: one line under `[Unreleased]`.

### Out of Scope

❌ **Changing the reader** (`:2297`–`:2299`) or the poll script. Their behaviour is correct and held by task.308's tests.
❌ **Clearing after the later-turn read.** Rejected above: it breaks a second read.
❌ **The `ci-ok` aggregator's handling of cancelled jobs**, named in task.308 as a separate candidate.

---

## 5. Breaking Changes

None - API stable. The change is internal pipeline prose and one test.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.309.plan.pin-6c-head-writer-position-and-clear-stale-head-file.md](task.309.plan.pin-6c-head-writer-position-and-clear-stale-head-file.md)

### Phase 1: Pin the writer position

**Risk Level**: Low

**Files**:
- `evals/shared/tests/finalise-publish-boundary.test.mjs`

**Changes**:
- [x] Extend the writer test to find the `nohup bash "$POLL"` line and the `rm -f` line in `codeLines(sixC)` and assert rm index < writer index < launch index.
- [x] Mutation-prove it: move the writer below the launch in the working file (Edit, then Edit back) and confirm the test is red. Red: "must clear (line 11), then record the head (line 15), then launch the poll (line 12)".

**Dependencies**: none

---

### Phase 2: Clear the stale head file

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md`
- `evals/shared/tests/finalise-publish-boundary.test.mjs`

**Changes**:
- [x] Add `.claude/state/finalise-ci-head-2.txt` to the `rm -f "$RESULT" "$PIDFILE"` line (above the writer) and say so in the comment above the writer.
- [x] Add a test that runs the shipped `rm` line in a scratch repository holding a stale head file and asserts it is gone and the writer line then records the new head.
- [x] Mutation-prove it: drop the head file from the `rm` and confirm the test is red (done: 1 fail, 47 pass; reverted, 48 pass).

**Dependencies**: Phase 1 (the order assertion names the `rm` line this phase edits).

---

### Phase 3: Bundle, docs and gate

**Risk Level**: Low

**Files**:
- `skills/develop-*/references/` bundled copies, if `npm run bundle` regenerates any that carry the 6c block
- `CHANGELOG.md`

**Changes**:
- [x] Run `npm run bundle` and `npm run bundle:check`; commit any regenerated copies (three `develop-*` hooks-doc copies regenerated).
- [x] Add the CHANGELOG line citing `(task 309)`.
- [x] Run the finalise tests and the fast gate (`npm run test:remote`): 8477 tests, 8474 pass, 0 fail, 3 skipped.

**Dependencies**: Phases 1 and 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/SKILL.md` - the 6c `rm -f` line and the writer's comment

### Files to Modify (Tests)

2. ✅ `evals/shared/tests/finalise-publish-boundary.test.mjs` - order assertion, stale-file test

### Files to Modify (Documentation)

3. ✅ `CHANGELOG.md` - one line under `[Unreleased]` › Fixed
4. ✅ `shared/resources/develop-pipeline-hooks.md` - one clause on line 56: 6c clears the head file at the start of a run (source; the three `develop-*` copies are generated)

### Generated

5. ✅ Bundled copies under `skills/*/references/`, only if `npm run bundle` changes any (measure with `git status` after the run; `git grep -l finalise-ci-head-2 -- skills` lists the carriers)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the two tests in `evals/shared/tests/finalise-publish-boundary.test.mjs`, both running the shipped lines.

**Actions**:
- [x] The order test: rm < writer < launch by line index.
- [x] The clear test: a stale head file is removed by the shipped `rm` line; the writer then records the new head.
- [x] The existing writer and reader tests stay green.

**Command**: `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs`

### Mutation Proof

- [x] Move the writer below the launch: the order test is red.
- [x] Drop the head file from the `rm` line: the clear test is red.
- [x] Each mutation is reverted and the tests re-run green.

### Integration Tests

**Scope**: the fast gate. **Command**: `npm run test:remote` (LAN server first; `TEST_LOCAL=1` only when it is down), then `CI=true` for the touched suite before pushing.

---

## 9. Success Criteria

### Functional

- [x] Moving the writer line below the `nohup bash "$POLL"` line turns the order test red.
- [x] A stale `finalise-ci-head-2.txt` present before 6c runs is gone after the shipped `rm` line.
- [x] The later-turn reader is unchanged and its three existing tests stay green.

### Performance

- [x] No timing criterion. The change adds one path to an existing `rm -f`.

### Code Quality

- [x] `npm run bundle:check` is clean.
- [ ] The fast gate passes with 0 not ok; the figure is recorded in the QA report.
- [x] `npm run validate -- skills/finalise/` passes (`SKILL.md` changes).

### Migration

- [x] `CHANGELOG.md` cites `(task 309)`.
- [x] No consumer change is needed.

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

None.

### LOW RISK

1. **Line-index assertions are brittle to a reflow.**
   - Risk: the order test compares positions of three lines, so inserting a line between them is fine but renaming one is not.
   - Probability: Low. Impact: Low (a red test with a clear message).
   - Mitigation: match each line by its own pattern (the `rm -f` line, the writer, the `nohup` line) and assert each is found once before comparing.
2. **A clear that deletes a file the reader still needs.**
   - Risk: removing the head file while an earlier poll's later turn is yet to read it.
   - Probability: Low. Impact: Low (reader HALTs with "re-run 6c").
   - Mitigation: the clear sits at the start of a new 6c run, where the new writer replaces the file in the next lines.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a red `finalise-publish-boundary` test on `develop` after merge, or a finalise run that HALTs "not recorded" on a first read.
- **Steps**: `git revert` the merge commit; run `npm run bundle` if copies changed; push through a PR.
- **Validation**: `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs` is green.

### Partial Rollback

- Revert Phase 2 alone (the `rm` and its test) and keep the order test; the phases touch different lines.

### Forward Fix

- A wrong order assertion is fixed forward in the test with no change to the skill.

### Rollback Triggers

- **Critical**: a finalise run HALTs on a first read because the clear removed a file the same run had just written.
- **Non-critical**: a reflow breaks the order test; fix forward.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-15 | 1.0 | Initial draft — task.308's two advisory cleanups | create-task |
| 2026-11-15 | 1.1 | Review passed (9/10) — two Optional plan clarifications applied (mutation proof on the working file; hooks doc line added to Phase 3) | review-task |
|  |  | Status → ready-for-development | review-task |
| 2026-11-15 | 1.2 | Implemented: order assertion + stale-head clear in 6c, both mutation-proved; hooks doc clause, CHANGELOG; status → ready-for-review | develop |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Pin the writer position
- [x] Phase 2: Clear the stale head file
- [x] Phase 3: Bundle, docs and gate

## References

- [task.308](../task.308.pause-commits-cancel-the-step-7-ci-poll/task.308.pause-commits-cancel-the-step-7-ci-poll.md) — origin; its DoD "Known Limitations & Future Work" and `task.308.qa.2` future recommendations
- PR #907, issue #906
