---
id: task.301
title: "PreCompact pause comment names the cycle and the pause count"
type: task
description: "Follow-up to the PreCompact keep-the-lock fix (PR 873): the step-scoped pause comment gains the QA cycle and a pause count, the Step 1 paused-lock block is pinned by tests, and the stateful gh fixture's counter gets a test that goes red without it."
tags: [pipeline, precompact, hooks, tests]
category: refactoring
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: PreCompact pause comment names the cycle and the pause count

**Status:** Planned

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

- The marker and body: `shared/resources/develop-pipeline-on-precompact.sh:391` (`<!-- agent-skills-comment:pipeline-paused-${CURRENT_STEP} -->`), the lead at `:373`, the issue arm at `:476`.
- The Step 1 block and the Start-fresh exception: `shared/resources/develop-pipeline-step-1-create-branch.md:32-36` (`pause_reason == "precompact"`).
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

- [ ] Read the QA cycle from the lock when present, and keep a per-step pause count (store it in the lock's `paused` record or the snapshot; do not invent a second state file).
- [ ] Put both in the PR comment body, edited in place on a repeat.
- [ ] Test: pause twice at one step in different QA cycles. One PR comment whose body names the second cycle and `pause 2`; one issue comment.

### Phase 2: Pin the Step 1 block — Risk: Low

- [ ] Cover three cases, adding whichever is missing: another document's paused lock halts with both commands (resume and abandon); the same document with "Start fresh" proceeds and removes the lock and the snapshot (only when `pause_reason == "precompact"`); an unpaused lock for another document halts unchanged.

### Phase 3: Pin the fixture counter — Risk: Low

**Files:** `shared/resources/develop-pipeline-on-precompact.test.sh`

- [ ] A scenario that pauses at two different steps and asserts two kept files and two `pr comment` argv lines in `$GH_LOG`.
- [ ] Re-run the mutation (`next_n` replaced by `echo 0`) and confirm the new scenario goes red.

### Phase 4: Bundle and docs — Risk: Low

- [ ] `npm run bundle`; `CHANGELOG.md` entry; `docs/reference/pipeline-artifacts.md` if the lock's `paused` record changed.

## 7. Files Summary

1. ✅ `shared/resources/develop-pipeline-on-precompact.sh`
2. ✅ `shared/resources/develop-pipeline-on-precompact.test.sh`
3. ✅ `shared/resources/tests/fixtures/precompact-gh-stateful.sh` (only if the counter needs to change)
4. ✅ the Step 1 test file (found by grepping the existing Step 1 paused-lock tests)
5. ✅ bundled `references/` copies, `CHANGELOG.md`

## 8. Testing Strategy

Behaviour, not source text: drive the hook with the stateful `gh` stub and assert the kept comment bodies and the logged argv. Mutation-prove each new test: remove the cycle/count text, revert Step 1's Start-fresh removal, replace `next_n` with `echo 0`. Run `npm run test:remote -- --run ci` from a full clone (a linked worktree cannot run the route until task 302), and `lint:shell`, which `ci:fast` does not include.

## 9. Success Criteria

**Functional**

- [ ] Two pauses at one step in different cycles leave one PR comment naming the second cycle and `pause 2`, and one issue comment. Held by a test.
- [ ] The three Step 1 cases each have a test.
- [ ] A pause at two steps leaves two kept comments and two `pr comment` lines; the `echo 0` mutation turns that test red. The red run is recorded in the QA report.

**Performance**

- [ ] The hook makes no additional network calls: the stub's argv log is compared before and after.

**Code quality**

- [ ] `npm run bundle:check`, `lint:shell` and `ci:fast` pass; the latter via `npm run test:remote`.

**Migration**

- [ ] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a pause count stored in a new place diverges from the lock. Mitigation: store it with the existing `paused` record. **Low:** the comment grows; one line.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a hook that fails to post a pause comment (Critical); wording (non-critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 4

## References

- PR #873 and the handoff `handoff-precompact-keep-lock.md` (decisions 1 and 2, item 3)
