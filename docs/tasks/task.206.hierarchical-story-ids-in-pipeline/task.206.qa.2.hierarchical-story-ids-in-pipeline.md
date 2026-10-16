# QA Report: Task 206 - Hierarchical story ids in the pipeline (cycle 2, refute pass)

**Task**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md)
**Gate File**: [task.206.gate.2.hierarchical-story-ids-in-pipeline.yml](./task.206.gate.2.hierarchical-story-ids-in-pipeline.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 2)
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's five gated fixes all hold: bugs 1–4 are verified and closed. The refute pass re-read the
whole branch and found that the CR-8 fix is only half done. Step 0a.3 now derives `STORY_STEM`
itself, but it still reads `CURRENT_BRANCH`, which only 0a.1 binds. Run as its own shell, its
auto-skip therefore never fires. The reviewer rated this high with high confidence, so the gate is
FAIL. QA's own mutation spot checks found two small test gaps in cycle 1's fixes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Bug | Status |
| --- | --- | --- |
| CR-1 sync-github-story Step 5b unbound `STORY_ID` | [bug.1](./task.206.bug.1.sync-github-story-edit-block-reads-unbound-story-id.md) | ✅ FIXED — closed |
| CR-2 / CR-3 ensure-story blocks unbound `MILESTONE_TITLE` / `STORY_ID` | [bug.2](./task.206.bug.2.ensure-story-milestone-and-dedup-read-unbound-values.md) | ✅ FIXED — closed |
| CR-4 digit-led story-bug slug | [bug.3](./task.206.bug.3.story-bug-with-digit-led-slug-no-longer-resolves.md) | ✅ FIXED — closed |
| CR-5 create-story first-story ENOENT | [bug.4](./task.206.bug.4.create-story-uniqueness-check-throws-on-first-story.md) | ✅ FIXED — closed |
| CR-8 0a.3 unbound `STORY_STEM` | — | ⚠️ PARTIAL — `STORY_STEM` is bound, `CURRENT_BRANCH` is not (CR2-1) |
| Advisory CR-6, -7, -9, -10, -11, -12 | — | ✅ addressed (CR-6: writer and standard moved; 6 reader sites recorded for task.207) |

---

## Testing Scope

### Review Methodology

Cycle 2 is a full refute pass over the whole branch diff against `origin/develop`. Generated
`skills/*/references/*` copies and the renamed develop-story replay fixtures were excluded, as in
cycle 1; the patch was 7397 lines and 89 files. One Explore reviewer ran with the REFUTE PASS
directive and returned in 259.5 s (`duration_ms`).

Re-review scope: unscoped, as cycle 2 always is (refute pass, whole branch).

Step 4b: the runnable-prose engine classifies the changed blocks as mutating or placeholder. The new
blocks are executed by `step-0-epic-resolution.test.mjs` (11 cases, bash; zsh is not installed on
this host).

---

## New Findings This Cycle

- **[high]** `shared/resources/review-pipeline-step-0a-branch-setup.md:131` — 0a.3 still reads
  `CURRENT_BRANCH`, which only 0a.1 binds. → Bind it in the block, and test from a real branch.
  (CR2-1, [bug.5](./task.206.bug.5.step-0a-3-reads-current-branch-from-another-block.md))
- **[low]** `skills/sync-jira-bug/tests/sync-jira-bug.test.js` — mutation `no-red-untested`: no case
  exercises bug-doc's `id === prefix` / artifact guard. (QA2-1)
- **[low]** `evals/shared/tests/step-0-epic-resolution.test.mjs` — mutation `no-red-untested`: the
  ensure-story dedup block's empty-id HALT is never run on a non-story file. (QA2-2)
- Advisory: CR2-2 through CR2-7 (see Code Review).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | bug-doc digit-slug fix verified; QA2-1 test gap |
| Phase 2 | PASS | uat-status warnings counted; CR2-4/5 advisory |
| Phase 3 | FAIL | CR2-1 |
| Phase 4 | PASS | unchanged |

---

## Success Criteria Verification

Unchanged from cycle 1, except that the "Step 0 / 0a extract (P, E, S)" criterion is now held for
0a.2 and partly for 0a.3. The auto-skip works when `CURRENT_BRANCH` is bound, and CR2-1 is the gap.
The suite is green: `ci:fast` 5755/0, and `eval:all`, `bundle:check`, `lint:shell` and
`validate:all` all exit 0 (fix commit d58d3944).

---

## Breaking Changes Validation

PASS. No change since cycle 1.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Step 0a.3 reads `CURRENT_BRANCH` from another block (CR2-1)**
- **Bug Report**: [task.206.bug.5](./task.206.bug.5.step-0a-3-reads-current-branch-from-another-block.md)
- **Observation**: Run alone, `CURRENT_BRANCH` is empty and `AUTO_SKIPPED` stays `false`.
- **Provenance**: base 0a.3 read `CURRENT_BRANCH` from 0a.1 too. It is kept in scope because cycle 1
  claimed 0a.3 was self-binding (obs #267).

### MEDIUM Severity Issues (0 gated; 3 advisory)
CR2-2, CR2-3 and CR2-4 are `medium/medium`, so they are advisory.

### LOW Severity Issues (2 gated)
QA2-1 and QA2-2, both mutation-proof test gaps.

**Total Issues**: HIGH: 1, MEDIUM: 0 gated, LOW: 2 gated

---

## NFR Assessment

### Performance — PASS
No hot-path change.

### Reliability — CONCERNS
CR2-1, plus the advisory cross-block reads (CR2-2, CR2-3), `--check` exit codes (CR2-4) and
pipefail (CR2-6).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 40
- `isWorkItemDocument` was re-probed: verdict `engages`, 0 reproduced
  (`task.206.qa.2.security.run.json`).

### Maintainability — PASS

---

## Code Review

**Correctness bugs (6):**
- [high/high] `shared/resources/review-pipeline-step-0a-branch-setup.md:131` — 0a.3 reads an unbound `CURRENT_BRANCH`. → Bind it in the block. → **gate TASK-206-CR2-1**
- [medium/medium] `skills/ensure-story-github-issue/SKILL.md:208` — The create block still reads `STORY_TITLE`, `DOC_URL` and `STORY_RELATIVE_PATH` without binding them. Pre-existing on base: no block anywhere sets `STORY_TITLE`. → Route to a follow-up.
- [medium/medium] `skills/sync-github-story/SKILL.md:196` — Step 5b still reads `STORY_TITLE`, `NEW_BODY` and `ISSUE_NUM` without binding them. Pre-existing. → Route to a follow-up.
- [medium/medium] `skills/qa-next/scripts/uat-status.mjs:764` ⚠️ unverified anchor (text-mismatch; the reviewer said 757) — `--check` exits 0 despite scan warnings, and qa-next gates on the exit code. → Make them errors, or gate on the count.
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:158` — Commands that skip `loadStories` drop surface-key warnings silently. → Print them in `requireSurfaces`.
- [low/low] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:67` — With pipefail, a `find` permission error HALTs the epic lookup. → Check only the node filter's status.

**Cleanups (1):**
- `skills/ensure-story-github-issue/SKILL.md:106` — A stale comment says `MILESTONE_TITLE` comes from S1.

Boundary: `boundary: true` for `isWorkItemDocument`, `probes_executed: 40` (above).

Mutation spot checks (QA, snapshot and restore):

mutation-proven: bug-doc `storyBugParts` `id === prefix` / artifact guard removed → no test red → no-red-untested (QA2-1)
mutation-proven: ensure-story dedup empty-`STORY_ID` HALT removed → no test red → no-red-untested (QA2-2)

The seven cycle-1 fix mutations (qa-fix, recorded in the implementation report) each reddened a
committed test: covered.

---

## Regression Testing

`ci:fast` 5755/0 and `eval:all` green at d58d3944. No regressions found.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1 (bug.5), and the test gaps QA2-1 and QA2-2.

### Short-term Actions (Non-Blocking)
1. CR2-4, CR2-5, CR2-6 and CR2-7 are cheap and can go in the same cycle. CR2-2 and CR2-3 are
   pre-existing unbound reads in the tracker create/edit blocks and go to a follow-up.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high, high-confidence bug (CR2-1) maps to the gate under `code_review_blocking`.
**Quality Score**: 80/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3 (scoped to files changed since this gate's head).
