---
id: task.308
title: "Pause commits cancel the step 7 CI poll"
type: task
description: "Hold the PreCompact pause-commit push at step 7, as task.303 does at step 8, so a pause no longer cancels the CI run finalise is waiting on."
tags: [pipeline, precompact, ci, finalise]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-14
updated: 2026-11-14
estimated_effort_hours: 3
github_issue: 906
---

# Technical Task: Pause commits cancel the step 7 CI poll

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.308.review.1.pause-commits-cancel-the-step-7-ci-poll.md` implemented 2026-11-14

**GitHub Issue**: [#906](https://github.com/Gamaroff/agent-skills/issues/906)

Follow-up to [task.303](../task.303.pause-commits-restart-ci-and-block-docs-only-shortcut/task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md), which held the pause-commit push at step 8 only. Raised from a consumer run (tinker-city bug.144, PR #1257, 2026-11-14).

---

## 1. Overview

The PreCompact hook commits a "pipeline paused" block to the implementation report and pushes it. At step 7 that push makes a new PR head while `/finalise` is polling CI on the old one. The consumer's CI uses `cancel-in-progress`, so the push cancels the run finalise is waiting on.

## 2. Motivation

On bug.144 a pause at step 7 (`06713e7a`, 10:48Z) cancelled CI run `bdd7246b` about an hour in: `portal-tests` and `api-tests` were green, and `portal-e2e` and `live-e2e` were cut off. CI reading 1 then timed out PENDING on the moved head, and finalise needed a second full run (about 1 h) on the new one. That second run went red on a loaded host and halted the pipeline, which cost a third run before acceptance. Not every one of those hours is the hook's fault, but the first cancelled hour is. Each further pause during the wait repeats it.

This is the same defect task.303 fixed, at the other step that waits on CI. task.303 kept step 7 as its "still pushes" control (scenario 17g). Its records don't say step 7 must push; it was just the next step down.

## 3. Technical Background

**Current state (read 2026-11-14, bundled copy in tinker-city):**

- `shared/resources/develop-pipeline-on-precompact.sh`, push block (find `PUSH_HOLD_REASON`): `if [ "$CURRENT_STEP" = "8" ]; then PUSH_HOLD_REASON=step8`; every other step pushes unless the dangling-link probe holds it. The signal wording is the `REPORT_LINT_NOTE` / `REPORT_LINT_SUMMARY` `elif` that tests `PUSH_HOLD_REASON = step8`.
- **Lock timing:** `/finalise` advances the lock to 8 only at its end (`skills/finalise/SKILL.md`, the `advance-pipeline-lock.sh --skill finalise` call), so the lock reads 7 for the whole CI poll. That is the window a step-7 hold covers.
- **Steps 5 and 6 are one step to the lock** (`current_step: 5`, `qa_phase` names the sub-step; `advance-pipeline-lock.sh 6` is never issued). A pause "at step 6" cannot occur, so the control scenario uses step 5 (see Phase 3).
- `/finalise` Step 7 marks its CI poll on the lock: `set-waiting-on.sh "step-7 CI poll (reading 2)" --kind task`, then backgrounds `finalise-ci-poll.sh <pr> <sha> …` on a fixed SHA. Reading 2 checks that the PR head equals the pushed acceptance head and HALTs otherwise.
- Under the "CI once, at finalise" rule, QA cycles (steps 5–6) use a local fast gate, so steps 7 and 8 are the only steps whose CI result the run waits on.

**Options.**

- **(a)** Hold at steps 7 and 8: `case "$CURRENT_STEP" in 7|8)`. This adds one arm to task.303's seam, and finalise's own commit (6a acceptance, or the 8.x gaps/HALT commit) carries the held pause commit and pushes once.
- **(b)** Hold whenever the lock's `waiting_on` names a CI poll. This is more general, but it depends on a free-text label and misses a pause that lands between two polls.

Recommended: (a). Phase 1 confirms (a) is safe.

**Risk to rule out in Phase 1:** a held pause commit leaves local `HEAD` one commit ahead of the PR head. If any step 7 path, including a step 7 re-run after a resume, takes its SHA from `git rev-parse HEAD` rather than the PR head or the SHA it pushed, it would poll a commit CI never saw. The poll would then wait until it times out, or reading 2's head check would HALT.

**Confirmed by the review (2026-11-14), find each with `grep -n 'rev-parse HEAD' skills/finalise/SKILL.md`:** the risk is real. The later-turn re-derivation `CI_HEAD_2=${CI_HEAD_2:-$(git rev-parse HEAD)}` (its comment says "HEAD has not moved since the acceptance push") breaks once a pause commit is held during the reading-2 poll. The other local-`HEAD` reads to classify in Phase 1: `RERUN_HEAD`, the Bitbucket `HEAD_SHA`, the two tree-equivalence `--head` reads, the `CI_HEAD_2` set right after the acceptance push (safe: the push carries every local commit) and the `CI_HEAD_1` re-record.

## 4. Scope

**In scope:** ✅ the step-7 hold ✅ moving the control scenario ✅ tests, docs, `CHANGELOG.md`, bundled copies.

**Out of scope:** ❌ consumer CI configuration (`cancel-in-progress`) ❌ `ci-tree-equivalence.js` ❌ the template `ci-ok` aggregator's handling of cancelled jobs (task.303's candidate follow-up).

## 5. Breaking Changes

None. A held pause commit reaches the remote with finalise's next commit instead of at once.

## 6. Implementation Plan

### Phase 1: Read and confirm — Risk: Low

- [x] List every SHA source in `/finalise` Steps 5–8 (readings 1 and 2, the gaps path, the re-run arm) and in `develop-bug` / `develop-story` / `develop-task` Step 7 resume. Record which read local `HEAD` and which read the PR head or a pushed SHA, with a disposition for each (fix, safe because the push carries it, or not a CI read). Write the table into this task document's Phase 1 section; the implementation report is committed after `/finalise` grades, so it cannot be the record. Search: `grep -n 'rev-parse HEAD\|headRefOid' skills/finalise/SKILL.md shared/resources/develop-pipeline-step-7-finalise.md`.
- [x] Confirm every finalise exit at step 7 (accepted 6a, gaps 8.x, HALT) commits and pushes, so a held pause commit always leaves with it. Name any exit that does not.
- [x] Choose (a) or (b) and record why in the implementation report's Decisions Log.

**Phase 1 record (2026-11-14).** SHA sources in `skills/finalise/SKILL.md` (search: `grep -n 'rev-parse HEAD\|headRefOid' skills/finalise/SKILL.md`), and `shared/resources/finalise-ci-poll.sh`. The step-7 docs (`shared/resources/develop-pipeline-step-7-finalise.md`, `skills/develop-bug/references/develop-pipeline-step-7-finalise.md`) hold no SHA source of their own.

| Source | Reads | Disposition |
| --- | --- | --- |
| `RERUN_HEAD=$(git rev-parse HEAD)` (re-run scope, Step 3) | local `HEAD` | Not a CI read. It names the head this run's agents read the document on, which is local by definition |
| Bitbucket `HEAD_SHA=$(git rev-parse HEAD)` (Step 6 reading 1) | local `HEAD` | Not affected by a step-7 hold: reading 1 runs before the acceptance push, and a pause held earlier in step 7 is carried by that push. Bitbucket is out of this task's scope (the poll is GitHub-only) |
| `--head "$(git rev-parse HEAD)"` in the Step 6 tree-equivalence call and `finalise-delta.js rerun-eligible --head` | local `HEAD` | Not a CI read of the PR head: both compare trees and file sets between commits. A held report-only pause commit adds a docs-only delta to a docs-only walk |
| `CI_HEAD_2=$(git rev-parse HEAD)` right after `git push origin "$BRANCH"` (6a) | local `HEAD` | Safe: the push carries every local commit, so local `HEAD` is the pushed head at that moment |
| `CI_HEAD_2=${CI_HEAD_2:-$(git rev-parse HEAD)}` on the later turn (6c) | local `HEAD` | **Fixed.** A pause held during the poll puts local `HEAD` ahead of the PR head, and the comparison with the sampled head would HALT. The poll block now records the head to `.claude/state/finalise-ci-head-2.txt`; the later turn reads it and HALTs when it is missing |
| `CI_HEAD_1=$(git rev-parse HEAD)` re-record (fix head, Step 8a) | local `HEAD` | Safe: it follows a fix commit and push, which carry every local commit |
| `PR_HEAD=$(gh pr view --json headRefOid)` (6c) | PR head | Correct as is: it is the compare target |
| `sampled_head()` in `finalise-ci-poll.sh` | PR head | Correct as is |

Exits at step 7: the accepted path (6a) commits and pushes; the gaps path (Step 8.x) commits and pushes (develop pipeline step 7 doc: "DoD gaps halt (with commit + push)"); a HALT mid-poll (CI red, timed out) pushes nothing new and leaves the held commit local, and the next `/finalise` run's acceptance or gaps commit carries it. No exit loses a held commit.

Decision: option (a), hold at `7|8`. Option (b) keys on the free-text `waiting_on` label and misses a pause between two polls; (a) adds one arm to task.303's seam and `/finalise` already pushes every commit it makes.

### Phase 2: Fix — Risk: Medium

- [x] (a): widen the hold to `7|8` with `PUSH_HOLD_REASON=ci-wait` (or one reason per step), and update the stderr line, the signal text and `REPORT_LINT_NOTE` / `REPORT_LINT_SUMMARY` so they name step 7 correctly.
- [x] Fix the local-`HEAD` SHA sources Phase 1 classifies as a fix. At minimum the later-turn `CI_HEAD_2` re-derivation in `skills/finalise/SKILL.md`: take the head from the PR (`gh pr view --json headRefOid`; Bitbucket `.source.commit.hash`) or from the SHA the poll was started on, never from local `HEAD`. Where a source cannot be fixed, HALT with a message naming the held commit.

### Phase 3: Tests and docs — Risk: Low

- [x] New scenario: a step 7 pause is committed and **not** pushed (the remote head is unchanged). Mutation-prove it by reverting the arm and confirming the scenario goes red.
- [x] Move control 17g to step 5 (the QA loop; the lock never reads 6): a step-5 pause still pushes. Seed the fixture with a document directory as scenario 16 does, because step 5 takes the hook's QA-cycle branch.
- [x] Keep 17f (step 8 held) green: the step-8 message keeps the words `NOT pushed` and `Step 8`; the step-7 message names step 7 separately.
- [x] Add a test for the `CI_HEAD_2` fix: with a held pause commit local `HEAD` is ahead of the PR head, and the re-derived head still equals the PR head. Mutation-prove it (revert the fix, confirm red).
- [x] Add a scenario for "every step 7 exit pushes the held commit": a step-7 pause (held), then the acceptance commit and push, ends with the remote head equal to local `HEAD`.
- [x] Update `develop-pipeline-hooks.md`, `CHANGELOG.md`, and the bundled `references/` copies (`npm run bundle`).

## 7. Files Summary

1. `shared/resources/develop-pipeline-on-precompact.sh`
2. `shared/resources/develop-pipeline-on-precompact.test.sh`
3. `shared/resources/develop-pipeline-hooks.md`, `CHANGELOG.md`, bundled `references/` copies
4. `skills/finalise/SKILL.md` (the later-turn `CI_HEAD_2` re-derivation, confirmed by the review) and its test

## 8. Success Criteria

- A pause at step 7 commits the report and leaves the remote head unchanged (new scenario, mutation-proved).
- A pause at step 5 still pushes (moved control).
- A pause at step 8 is still held (17f).
- Every step 7 exit pushes the held commit with its own commit: held at step 7, then the acceptance commit and push leaves the remote head equal to local `HEAD` (named scenario in `develop-pipeline-on-precompact.test.sh`).
- With a held pause commit, `/finalise`'s later-turn reading-2 head equals the PR head, not local `HEAD` (named test, mutation-proved).
- The Phase 1 SHA-source table, with a disposition per source, is in this document's Phase 1 section.

## 9. Risks

**Medium:** a held commit is invisible to a step that polls local `HEAD`. Phase 1 exists to find that, and the review already found one (`CI_HEAD_2` re-derivation). **Low:** stale wording that names only step 8. **Rollback:** revert the `7|8` arm; a held pause commit is never lost, because every `/finalise` exit commits and pushes, and a HALT leaves it local for the next push.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-14 | 0.1 | Drafted from tinker-city bug.144 (PR #1257): a step 7 pause cancelled finalise's CI run | Claude |
| 2026-11-14 |  | GitHub issue created (#906) | sync-github-task |
| 2026-11-14 | 0.2 | Review passed (8/10): control moved from step 6 (never a lock value) to step 5; confirmed local-HEAD source in finalise made concrete; tests and Phase 1 record location named | review-task |
| 2026-11-14 |  | Status → ready-for-development | review-task |
| 2026-11-14 |  | Implemented — 9 files, 3 tests | develop |
<!-- change-log-end -->
