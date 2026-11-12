---
id: task.303
title: "Pause commits restart CI and block the docs-only shortcut"
type: task
description: "Stop each pipeline pause commit from cancelling the previous head's CI run and forcing a full-CI wait at step 8."
tags: [pipeline, precompact, ci, finalise]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-10
updated: 2026-11-12
estimated_effort_hours: 4
---

# Technical Task: Pause commits restart CI and block the docs-only shortcut

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.303.review.1.pause-commits-restart-ci.md` implemented 2026-11-12

Cut from the handoff `handoff-precompact-keep-lock.md`, "Also found" item 1.

---

## 1. Overview

On a consumer run (task.153, 2026-11-10) each PreCompact pause commit at step 8 was pushed, which cancelled the previous head's CI run. The cancelled `ci-ok` read as a failure, so the docs-only shortcut did not apply, and the run waited for full CI each time (about 50 minutes at worst). The related consumer memory is "superseded CI runs poison the rollup".

## 2. Motivation

A pause commit changes only documents (the report and the pause snapshot). A run that is cancelled because a newer commit superseded it says nothing about the tree, yet it is read as red. The cost is wall-clock, never a wrong answer (see Technical Background), but a pause at step 8 on a long run multiplies it.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- `shared/resources/ci-tree-equivalence.js` header (lines 24-45): `code-changed` is final only when no nearer ancestor was walked past undecided (PENDING, NONE, CANCELLED, or green but not settled); otherwise the answer is `no-green-ancestor`, which a poll asks again. "A CANCELLED ancestor is re-asked too: it costs polling, never a wrong answer."
- The hook already holds the pause-commit push when the report links to a staged-but-uncommitted path (PR #873).

**Read during review (2026-11-12):**

- `classifyTreeEquivalence` already walks **past** a `CANCELLED` ancestor and keeps looking for an older green one (held by the case at `shared/resources/tests/ci-tree-equivalence.test.mjs:1086`). A green **successor** of a cancelled run is by definition a nearer first-parent ancestor of the head, so the walk meets it first. Option (a) as first worded therefore changes no answer.
- The gap is one layer down. `reduceChecks` maps only `conclusion: "cancelled"` to `CANCELLED`; every other non-success conclusion maps to `FAILURE`, and one `FAILURE` among a run's checks makes the whole rollup `FAILURE`. The walk stops at a `FAILURE` ancestor ("the head inherits that red"). If a cancelled run leaves its `if: always()` aggregator (`ci-ok`) concluded `failure`, the ancestor reads red and the shortcut never applies. That matches the consumer symptom, but it is **unverified**: `docs/runbooks/ci-docs-only-skip.md` says the aggregator "fails only when a job failed", and the consumer's real check conclusions are not captured in the tree.
- `develop-pipeline-on-precompact.sh` already holds the pause-commit push for a dangling link (`PUSH_HELD`, lines 387-406), so Option (b) has a seam to extend.

**So the premise is partly handled:** a cancelled ancestor is not a wrong answer today; it is a delay. What is missing is one of the two options below.

**Options.** (a) In `reduceChecks` (not the walk), read a run whose non-success checks are all `cancelled`, or whose aggregator `failure` Phase 1 shows is caused by the cancel, as `CANCELLED` and not `FAILURE`. A run with a real `failure` check stays `FAILURE`. (b) Hold the pause-commit push at step 8, as the hook does for a dangling link, and let the step's own commit carry it. Phase 1 reads the code and the consumer evidence, and chooses.

## 4. Scope

**In scope:** ✅ the choice ✅ the fix ✅ tests of the walk or the hold.

**Out of scope:** ❌ changing how CI is configured in a consumer ❌ the docs-only path list.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1: Read and choose — Risk: Low

- [x] Read the ancestor walk and `reduceChecks` in `ci-tree-equivalence.js` and state what each does with a cancelled run: at classify level (already walked past) and at check level (which conclusions reduce to `CANCELLED` and which to `FAILURE`). Reproduce the consumer case with a fixture built from the **check shapes the API returns** (a cancelled workflow run whose aggregator concluded `failure`), not from the abstract `CANCELLED` rollup, which already passes. If a real capture is not available, say so and build the shape from the runbook's aggregator snippet.
- [x] Choose option (a) or (b) and record why in the implementation report's Decisions Log. **(b)**: the shipped template's `ci-ok` exits 1 on `tests=cancelled`, so a cancelled run's rollup is `FAILURE` and the walk stops. Option (a) would have to tell a cancel-caused aggregator failure from a real one by conclusion alone, which can green a red run (the task's own High risk). (b) removes the cause and touches no engine.

### Phase 2: Fix — Risk: Medium

- [x] Option (b) taken: the hook holds the pause-commit push at step 8 (the `PUSH_HELD` seam, with a `PUSH_HOLD_REASON`). Not taken, option (a): in `reduceChecks`, a run is read as `CANCELLED` only when every non-success check is `cancelled`, or when Phase 1 shows the aggregator `failure` is caused by the cancel. A run with a real `failure` check stays `FAILURE`. The successor test is not needed (a green successor is already a nearer ancestor). Option (b): the hook holds the pause-commit push at step 8 (extend the `PUSH_HELD` seam).

### Phase 3: Tests and docs — Risk: Low

- [x] Scenarios 17f (step 8 held) and 17g (step 7 control pushed) in `develop-pipeline-on-precompact.test.sh`; mutation-proved. (Option (a)'s check-shape fixture is not needed.) Original wording follows. A fixture of check shapes for a cancelled run (and, for option (b), a step-8 pause); mutation-proved. Controls: a run with a real `failure` check stays `FAILURE`; a cancelled ancestor with no green ancestor behind it still answers `no-green-ancestor`. `CHANGELOG.md` entry; bundled copies.

## 7. Files Summary

1. ✅ `shared/resources/ci-tree-equivalence.js` (option a) or `shared/resources/develop-pipeline-on-precompact.sh` (option b)
2. ✅ the matching test files, bundled `references/` copies, `CHANGELOG.md`

## 8. Testing Strategy

Fixture-driven: a cancelled run, built from the check shapes the API returns, must reduce to `CANCELLED` and the head must read tree-equivalent (a), or a step-8 pause must not push (b). Mutation-prove. Control cases: a run with a real `failure` check must still reduce to `FAILURE`, and a cancelled ancestor with **no** green ancestor behind it must still answer `no-green-ancestor`, because skipping every cancelled run would hide a real red. Run `lint:shell` and the full suite via `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [x] The consumer case (a pause at step 8) no longer supersedes the head's CI run: the pause commit is committed and not pushed. Option (b) was chosen (see the implementation report's Decisions Log). Held by scenario 17f in `shared/resources/develop-pipeline-on-precompact.test.sh`, mutation-proved (the hold's condition changed to another step turns 17f red).
- [x] The control still pushes: the same report at step 7 is committed and pushed. Held by scenario 17g in `shared/resources/develop-pipeline-on-precompact.test.sh`. Option (a) was not taken, so the engine's `FAILURE` and `no-green-ancestor` answers are unchanged and already held by `shared/resources/tests/ci-tree-equivalence.test.mjs`.

**Performance**

- [x] No extra API calls per poll: option (b) changes only the hook's push decision and touches neither `ci-tree-equivalence.js` nor any poll. Held by documentation: `git diff develop -- shared/resources/ci-tree-equivalence.js` is empty.

**Code quality**

- [x] `npm run bundle:check`, `lint:shell` and `ci:fast` pass. Run on the branch: `bundle:check` 0 problems, `lint:shell` clean, `ci:fast` 8404 pass, 0 fail (via `npm run test:remote`).

**Migration**

- [x] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** treating a cancelled run as not red could hide a real failure. Mitigation: only when its own successor, on the same branch, is green; the control test. **Medium:** option (b) delays visibility of the pause commit. **Low:** wording.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a red tree accepted as green (Critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-12
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.303.qa.1.pause-commits-restart-ci.md](./task.303.qa.1.pause-commits-restart-ci.md)
- **Gate File**: [task.303.gate.1.pause-commits-restart-ci.yml](./task.303.gate.1.pause-commits-restart-ci.yml)

### Test Coverage Summary
- **Tests Executed**: 38 (precompact hook suite) plus the recorded `ci:fast` run
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. One low item: section 10 still describes option (a).

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |
| 2026-11-12 | 1.1     | Review passed (8/10): option (a) re-aimed at `reduceChecks` (the walk already skips cancelled ancestors); criteria name their holding tests and the call-count bound | review-task |
| 2026-11-12 |         | Status → ready-for-development | review-task |
|            |         | Implemented option (b): PreCompact hook holds the pause-commit push at step 8; scenarios 17f/17g; one fixture in step-8-completion-checklist updated; docs, CHANGELOG, bundles | develop |
| 2026-11-12 |         | QA gate PASS (95/100) — 0 findings | qa-task |

<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 3

## References

- the handoff `handoff-precompact-keep-lock.md`, "Also found" item 1
- PR #873 (the dangling-link push hold)
