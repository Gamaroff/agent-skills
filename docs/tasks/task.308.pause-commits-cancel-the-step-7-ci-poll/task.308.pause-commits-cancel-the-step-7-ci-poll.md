---
id: task.308
title: "Pause commits cancel the step 7 CI poll"
type: task
description: "Hold the PreCompact pause-commit push at step 7, as task.303 does at step 8, so a pause no longer cancels the CI run finalise is waiting on."
tags: [pipeline, precompact, ci, finalise]
category: refactoring
status: draft
priority: Medium
created: 2026-11-14
updated: 2026-11-14
estimated_effort_hours: 3
---

# Technical Task: Pause commits cancel the step 7 CI poll

**Status:** Draft

Follow-up to [task.303](../task.303.pause-commits-restart-ci-and-block-docs-only-shortcut/task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md), which held the pause-commit push at step 8 only. Raised from a consumer run (tinker-city bug.144, PR #1257, 2026-11-14).

---

## 1. Overview

The PreCompact hook commits a "pipeline paused" block to the implementation report and pushes it. At step 7 that push makes a new PR head while `/finalise` is polling CI on the old one. The consumer's CI uses `cancel-in-progress`, so the push cancels the run finalise is waiting on.

## 2. Motivation

On bug.144 a pause at step 7 (`06713e7a`, 10:48Z) cancelled CI run `bdd7246b` about an hour in: `portal-tests` and `api-tests` were green, and `portal-e2e` and `live-e2e` were cut off. CI reading 1 then timed out PENDING on the moved head, and finalise needed a second full run (about 1 h) on the new one. That second run went red on a loaded host and halted the pipeline, which cost a third run before acceptance. Not every one of those hours is the hook's fault, but the first cancelled hour is. Each further pause during the wait repeats it.

This is the same defect task.303 fixed, at the other step that waits on CI. task.303 kept step 7 as its "still pushes" control (scenario 17g). Its records don't say step 7 must push; it was just the next step down.

## 3. Technical Background

**Current state (read 2026-11-14, bundled copy in tinker-city):**

- `shared/resources/develop-pipeline-on-precompact.sh`, push block (about lines 400-424 of the bundled copy): `if [ "$CURRENT_STEP" = "8" ]; then PUSH_HOLD_REASON=step8`; every other step pushes unless the dangling-link probe holds it.
- `/finalise` Step 7 marks its CI poll on the lock: `set-waiting-on.sh "step-7 CI poll (reading 2)" --kind task`, then backgrounds `finalise-ci-poll.sh <pr> <sha> …` on a fixed SHA. Reading 2 checks that the PR head equals the pushed acceptance head and HALTs otherwise.
- Under the "CI once, at finalise" rule, QA cycles (steps 5–6) use a local fast gate, so steps 7 and 8 are the only steps whose CI result the run waits on.

**Options.**

- **(a)** Hold at steps 7 and 8: `case "$CURRENT_STEP" in 7|8)`. This adds one arm to task.303's seam, and finalise's own commit (6a acceptance, or the 8.x gaps/HALT commit) carries the held pause commit and pushes once.
- **(b)** Hold whenever the lock's `waiting_on` names a CI poll. This is more general, but it depends on a free-text label and misses a pause that lands between two polls.

Recommended: (a). Phase 1 confirms (a) is safe.

**Risk to rule out in Phase 1:** a held pause commit leaves local `HEAD` one commit ahead of the PR head. If any step 7 path, including a step 7 re-run after a resume, takes its SHA from `git rev-parse HEAD` rather than the PR head or the SHA it pushed, it would poll a commit CI never saw. The poll would then wait until it times out, or reading 2's head check would HALT.

## 4. Scope

**In scope:** ✅ the step-7 hold ✅ moving the control scenario ✅ tests, docs, `CHANGELOG.md`, bundled copies.

**Out of scope:** ❌ consumer CI configuration (`cancel-in-progress`) ❌ `ci-tree-equivalence.js` ❌ the template `ci-ok` aggregator's handling of cancelled jobs (task.303's candidate follow-up).

## 5. Breaking Changes

None. A held pause commit reaches the remote with finalise's next commit instead of at once.

## 6. Implementation Plan

### Phase 1: Read and confirm — Risk: Low

- [ ] List every SHA source in `/finalise` Steps 5–8 (readings 1 and 2, the gaps path, the re-run arm) and in `develop-bug` / `develop-story` / `develop-task` Step 7 resume. Record which read local `HEAD` and which read the PR head or a pushed SHA.
- [ ] Confirm every finalise exit at step 7 (accepted 6a, gaps 8.x, HALT) commits and pushes, so a held pause commit always leaves with it. Name any exit that does not.
- [ ] Choose (a) or (b) and record why in the implementation report's Decisions Log.

### Phase 2: Fix — Risk: Medium

- [ ] (a): widen the hold to `7|8` with `PUSH_HOLD_REASON=ci-wait` (or one reason per step), and update the stderr line, the signal text and `REPORT_LINT_NOTE` / `REPORT_LINT_SUMMARY` so they name step 7 correctly.
- [ ] Fix any local-`HEAD` SHA source that Phase 1 finds, or HALT on one with a message naming the held commit.

### Phase 3: Tests and docs — Risk: Low

- [ ] New scenario: a step 7 pause is committed and **not** pushed (the remote head is unchanged). Mutation-prove it by reverting the arm and confirming the scenario goes red.
- [ ] Move control 17g to step 6: a step-6 pause still pushes.
- [ ] Keep 17f (step 8 held) green.
- [ ] Update `develop-pipeline-hooks.md`, `CHANGELOG.md`, and the bundled `references/` copies (`npm run bundle`).

## 7. Files Summary

1. `shared/resources/develop-pipeline-on-precompact.sh`
2. `shared/resources/develop-pipeline-on-precompact.test.sh`
3. `shared/resources/develop-pipeline-hooks.md`, `CHANGELOG.md`, bundled `references/` copies
4. Possibly `skills/finalise/SKILL.md`, if Phase 1 finds a local-`HEAD` SHA source

## 8. Success Criteria

- A pause at step 7 commits the report and leaves the remote head unchanged (new scenario, mutation-proved).
- A pause at step 6 still pushes (moved control).
- A pause at step 8 is still held (17f).
- Every step 7 exit pushes the held commit with its own commit (Phase 1 record, and a test if Phase 1 finds a gap).

## 9. Risks

**Medium:** a held commit is invisible to a step that polls local `HEAD`. Phase 1 exists to find that. **Low:** stale wording that names only step 8.

## Change Log

| Date | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2026-11-14 | 0.1 | Drafted from tinker-city bug.144 (PR #1257): a step 7 pause cancelled finalise's CI run | Claude |
