---
id: task.301
title: "PreCompact pause comment names the cycle and the pause count"
type: task
description: "Follow-up to the PreCompact keep-the-lock fix (PR 873): the step-scoped pause comment gains the QA cycle and a pause count, the Step 1 paused-lock block is pinned by tests, and the stateful gh fixture's counter gets a test that goes red without it."
tags: [pipeline, precompact, hooks, tests]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-10
updated: 2026-11-12
estimated_effort_hours: 4
---

# Technical Task: PreCompact pause comment names the cycle and the pause count

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.301.review.1.precompact-pause-comment-names-cycle-and-count.md` implemented 2026-11-12

Follow-up to PR #873 (`fix/precompact-keep-lock`, merged as `5e491e3a`). The decisions below come from the other agent's handoff written after that work.

---

## 1. Overview

Three small items on one mechanism, the PreCompact hook and its tests:

1. **Comment granularity (decision 1).** Keep one pause comment per step (`pipeline-paused-${CURRENT_STEP}`, edited in place on a repeat). Add the QA cycle (when the lock has one) and a pause count ("pause 3 at step 6") to the body, so the PR always shows the latest pause and how many there were.
2. **A paused lock for another document blocks a new run (decision 2).** Already implemented in Step 1; pin it with the three tests below, adding any that is missing.
3. **The stateful `gh` fixture's counter is untested.** Replacing `next_n` with `echo 0` leaves the precompact suite at 31 passed, 0 failed.

## 2. Motivation

- The PR and the issue are status surfaces, not a log. On a consumer run (task.153, 2026-11-10) one step-scoped comment per step was the right amount across 5 QA cycles and 3 compactions. A cycle-scoped marker would post a comment per cycle times compaction. Each pause is already recorded in full in the implementation report and in its pause commit.
- With the lock kept, `paused` does not mean stopped: Claude Code continues the same session after a compaction. A paused lock can belong to a session still working, so a second run in the same checkout must be blocked, and a wall-clock "abandoned after N hours" rule would be a fixed budget standing in for a real signal. No age-based override.
- A fixture counter no test pins means a hook that posted a second comment would overwrite `pr-1.md` and the suite could miss it.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- The marker and body: `shared/resources/develop-pipeline-on-precompact.sh:409` (`<!-- agent-skills-comment:pipeline-paused-${CURRENT_STEP} -->`), the lead at `:391`, the body build at `:393`, the issue arm at `:477` (anchors re-read 2026-11-12; line numbers move, so search by the marker text).
- The Step 1 block and the Start-fresh exception: `shared/resources/develop-pipeline-step-1-create-branch.md:31-41` (`pause_reason == "precompact"`). The only executable parts are two fenced blocks; the "another document" HALT is a sentence.
- **The lock carries no QA cycle.** Its QA fields are `qa_phase`, `qa_max_cycles`, `extra_cycles_granted` and `convergence_from_cycle`. The cycle is read from the highest `{prefix}.gate.{N}.*` file in `task_or_story_directory`, as `grant-qa-cycles.sh` does.
- **Every lock writer clears the `paused` record** (`clear_pause`, `advance-pipeline-lock.sh`, `jq 'del(.paused)'`; `--restore` deletes it too), and the pause snapshot is consumed by the same call. A count inside either is lost between two pauses.
- The fixture: `shared/resources/tests/fixtures/precompact-gh-stateful.sh`, `next_n` at line 17.
- The suite: `shared/resources/develop-pipeline-on-precompact.test.sh` (31 tests).

**Out of scope:** making the issue arm edit in place. It needs a find-and-PATCH path in `tracker-comment.js`, which that script does not have. The issue answers `already` on a repeat and posts nothing.

## 4. Scope

**In scope:** ✅ the comment body ✅ the Step 1 tests ✅ the fixture counter test ✅ bundled copies.

**Out of scope:** ❌ the issue arm ❌ any age-based auto-override ❌ re-vendoring into a consumer repository (an owner decision).

## 5. Breaking Changes

None. The comment marker is unchanged; only the body gains text.

## 6. Implementation Plan

### Phase 1: The comment body — Risk: Low

**Files:** `shared/resources/develop-pipeline-on-precompact.sh`

- [x] Derive the QA cycle from the gate files on disk: while the lock's `current_step` is 5, the highest `{prefix}.gate.{N}.*` number in `task_or_story_directory`; at any other step, omit it. The lock has no `qa_cycle` field, so do not read one and do not add one.
- [x] Keep the pause count in a **top-level lock field `pause_counts`**, an object keyed by step (`{"6": 2}`), incremented by the hook for `CURRENT_STEP`. It must not live in the `paused` record or the snapshot: both are deleted or consumed by every lock writer. Keyed by step, a pause at a new step starts at 1 with no reset rule. Increment before the snapshot copy, so a `--restore` rebuilds the current count; if that ordering is not kept, say in the code comment that a restore may under-count by one.
- [x] Put the cycle and the count in the PR comment body (`pause 2 at step 6`, plus the cycle when there is one), edited in place on a repeat. The issue arm is unchanged (it answers `already` on a repeat).
- [x] Test: pause at step 5 with `gate.1` on disk, write the lock (`advance-pipeline-lock.sh 5` clears the mark), add `gate.2`, pause again. One PR comment whose body names cycle 2 and `pause 2`; one issue comment. Without the lock write between them the second pause is the "already paused" repeat and records nothing.
- [x] Mutation: remove the count text and the cycle text from the body in turn; the test goes red each time.

### Phase 2: Pin the Step 1 block — Risk: Low

- [x] Lift the "paused lock for another document" HALT from prose into the fenced collision block in `shared/resources/develop-pipeline-step-1-create-branch.md`, so the block exits 1 and prints both commands (`/develop-<skill> <its task_or_story_directory>` to resume, remove the lock to abandon). Edit the shared source only, then `npm run bundle`; the bundled copies (`develop-story`, `develop-task`, `develop-bug`) follow.
- [x] Add `shared/resources/tests/step-1-paused-lock.test.mjs` (the `shared/resources/tests/*.test.mjs` glob in `test:suite` reaches it). It extracts the two blocks with `extractBlocks` from `qa-execute-snippets.mjs`, as `halt-snippet-glob-safe.test.mjs` does, and runs them in a temp directory it removes in a `finally`. Three cases: another document's paused lock exits 1 and prints both commands; the same document with "Start fresh" removes the lock and the snapshot (only when `pause_reason == "precompact"`; a snapshot with another reason is kept); an unpaused lock for another document still exits 1 as before.

### Phase 3: Pin the fixture counter — Risk: Low

**Files:** `shared/resources/develop-pipeline-on-precompact.test.sh`

- [x] A scenario that pauses at two different steps, with an `advance-pipeline-lock.sh <N>` write between them (as scenario 19 does), and asserts two kept files and two `pr comment` argv lines in `$GH_LOG`.
- [x] Re-run the mutation (`next_n` replaced by `echo 0`) and confirm the new scenario goes red.

### Phase 4: Bundle and docs — Risk: Low

- [x] `npm run bundle`; `CHANGELOG.md` entry.
- [x] Add a `pause_counts` row to the lock-schema table in `shared/resources/develop-pipeline-pause.md` (next to the `paused` row): `{<step>: <n>}`, one writer (the hook), cleared by no lock writer. Run `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, which reads that table. Update `docs/reference/pipeline-artifacts.md` only if it lists lock fields.

## 7. Files Summary

1. ✅ `shared/resources/develop-pipeline-on-precompact.sh`
2. ✅ `shared/resources/develop-pipeline-on-precompact.test.sh`
3. ✅ `shared/resources/tests/fixtures/precompact-gh-stateful.sh` (only if the counter needs to change)
4. ✅ `shared/resources/develop-pipeline-step-1-create-branch.md` (the HALT lifted into the fenced block) and the new `shared/resources/tests/step-1-paused-lock.test.mjs` (`git grep -n 'pause_reason == "precompact"'` found no existing Step 1 test)
5. ✅ `shared/resources/develop-pipeline-pause.md` (the `pause_counts` row)
6. ✅ bundled `references/` copies, `CHANGELOG.md`

## 8. Testing Strategy

Behaviour, not source text: drive the hook with the stateful `gh` stub and assert the kept comment bodies and the logged argv. Mutation-prove each new test: remove the cycle/count text, revert Step 1's Start-fresh removal, replace `next_n` with `echo 0`. Run `npm run test:remote -- --run ci` from a full clone (a linked worktree cannot run the route until task 302), and `lint:shell`, which `ci:fast` does not include.

## 9. Success Criteria

**Functional**

- [ ] Two pauses at one step in different cycles leave one PR comment naming the second cycle and `pause 2`, and one issue comment. Held by a test.
- [ ] The three Step 1 cases each have a test.
- [ ] A pause at two steps leaves two kept comments and two `pr comment` lines; the `echo 0` mutation turns that test red. The red run is recorded in the QA report.

**Performance**

- [ ] The hook makes no additional network calls: a scenario asserts the exact number of `gh` calls one pause makes (the count read from the stub's `$GH_LOG` on the unchanged hook, kept in the test as a constant), so an added call turns it red.

**Code quality**

- [ ] `npm run bundle:check`, `lint:shell` and `ci:fast` pass; the latter via `npm run test:remote`.

**Migration**

- [ ] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a pause count stored in a new place diverges from the lock. Mitigation: a top-level `pause_counts` lock field, which lock writers preserve (the `paused` record does not survive them: `clear_pause` deletes it), held by a test that pauses, writes the lock and pauses again. **Low:** the comment grows; one line.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a hook that fails to post a pause comment (Critical); wording (non-critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |
| 2026-11-12 | 1.1     | Review found the count cannot live in `paused` (cleared by every lock writer), the lock has no `qa_cycle`, and the Step 1 HALT is prose; plan corrected (top-level `pause_counts`, cycle from gate files, HALT lifted into a fenced block, lock-schema row, call-count criterion) | review-task |
| 2026-11-12 |         | Status → ready-for-development | review-task |
| 2026-11-12 |         | Implemented — 8 source/doc files plus bundled copies, 11 new tests (3 hook scenarios, 8 Step 1 cases) | develop |

<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 4

## References

- PR #873 and the handoff `handoff-precompact-keep-lock.md` (decisions 1 and 2, item 3)
