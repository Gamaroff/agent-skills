# QA Report: Task 206 - Hierarchical story ids in the pipeline (cycle 3)

**Task**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md)
**Gate File**: [task.206.gate.3.hierarchical-story-ids-in-pipeline.yml](./task.206.gate.3.hierarchical-story-ids-in-pipeline.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 3)
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: PASS

---

## Executive Summary

Cycle 2's fix commit (ad9491ec) closes the one gated high (CR2-1, bug.5) and both test gaps
(QA2-1, QA2-2). QA verified each by mutation: a committed test went red every time. The scoped
review of the 19 files changed since gate 2 found no high-confidence bug. Its three low bugs and
two cleanups are advisory and go to follow-up.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Bug | Status |
| --- | --- | --- |
| CR2-1 0a.3 reads `CURRENT_BRANCH` from 0a.1 | [bug.5](./task.206.bug.5.step-0a-3-reads-current-branch-from-another-block.md) | ✅ FIXED — closed |
| QA2-1 no case for bug-doc's `id === prefix` / artifact guard | — | ✅ FIXED — `story.1.2.3.plan.bug.1.y.md` case, mutation-proven |
| QA2-2 dedup empty-id HALT never run on a non-story file | — | ✅ FIXED — non-story case, mutation-proven |
| Advisory CR2-4 (`--check` ignores scan warnings), CR2-5, CR2-6 (pipefail and `find`), CR2-7 | — | ✅ addressed in ad9491ec |
| Advisory CR2-2 / CR2-3 (unbound `STORY_TITLE` etc.) | — | ➡️ deferred (pre-existing; task Deferred Work) |

---

## Testing Scope

### Review Methodology

This is a focused re-review using direct tools and one Explore code reviewer. The reviewer was
dispatched and returned in 199.4 s (`duration_ms`).

Re-review scope: files changed since gate 2 (head d58d3944c688; 29 files) — default.

The 10 generated `skills/*/references/*` copies were excluded from the patch, which leaves 19 files
and 4485 lines. `SAFETY_REPROBE=false`: under clause 1 the prior security status was PASS, and
clauses 2–3 do not apply.

Step 4b: the changed blocks in `develop-pipeline-step-0`, `review-pipeline-step-0a` and
`ensure-story-github-issue` are run by `step-0-epic-resolution.test.mjs` under bash. zsh is not
installed on this host.

---

## New Findings This Cycle

None gated. The advisory findings are:

- **[low]** `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:69` — `find` errors are
  discarded, so "could not look" reads as "found nothing" (CR-1).
- **[low]** `evals/shared/tests/step-0-epic-resolution.test.mjs:169` — the chmod-000 test is vacuous
  when run as root (CR-2).
- **[low]** `skills/qa-next/scripts/uat-status.mjs:761` — scan errors share qa-next's
  `registry-invalid` remedy (CR-3).
- Cleanups CR-4 and CR-5 (see Code Review).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | QA2-1 closed |
| Phase 2 | PASS | uat-status `--check` now errors on scan warnings |
| Phase 3 | PASS | CR2-1 closed; 0a.3 is self-binding and tested from a real branch |
| Phase 4 | PASS | unchanged |

---

## Success Criteria Verification

All criteria hold as recorded in cycle 1. The "Step 0 / 0a extract (P, E, S)" criterion is now held
for 0a.3 as well: `step-0-epic-resolution.test.mjs` runs the block alone from a checked-out
`feature/story.1.1.1.*` branch. The suite is green at ad9491ec.

---

## Breaking Changes Validation

PASS. No change since cycle 1.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (3 advisory)
CR-1, CR-2 and CR-3 (see Code Review). None is high-confidence, so none is gated.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3 (advisory)

---

## NFR Assessment

### Performance — PASS
No hot-path change.

### Reliability — PASS
CR2-1 is fixed. CR-1 and CR-3 are low and advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 40
- `isWorkItemDocument` was re-probed (path, filename and 15 targeted cases): verdict `engages`, 0
  reproduced (`task.206.qa.3.security.run.json`).

### Maintainability — PASS
Cleanups CR-4 and CR-5 are advisory.

---

## Code Review

**Correctness bugs (3):**
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:69` — The CR2-6 fix
  sends `find` errors to `/dev/null` and swallows its exit, so an unreadable directory turns into
  "no epic", or hides a second claimant. → Warn with the unreadable paths.
- [low/medium] `evals/shared/tests/step-0-epic-resolution.test.mjs:169` — The chmod-000 regression
  test does not check that `find` failed, so it passes vacuously when run as root. → Assert the
  failure, or skip when `getuid() === 0`.
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:761` — `--check` now exits 1 both for registry
  rows and for unmigrated stories, and qa-next gives both one remedy ("Fix the row it names"). → Mark
  scan errors, and add a remedy that names `migrate-doc-numbering` and the surfaces key.

**Cleanups (2):**
- `skills/ensure-story-github-issue/SKILL.md:170` — The story-id and milestone derivation is copied
  into three blocks. → One sourced helper.
- `skills/qa-next/scripts/uat-status.mjs:270` — `loadStories` repeats `storyScan`'s warnings merge.
  → Reuse `storyScan`.

No finding was promoted to `top_issues`: none is `bug` with `confidence: high`. All anchors check
`ok` or `unchecked-text`.

Boundary: `boundary: true` for `isWorkItemDocument`, `probes_executed: 40` (above).

Mutation spot checks (QA, snapshot and restore, run after the reviewer returned):

mutation-proven: 0a.3 `CURRENT_BRANCH=$(git branch --show-current)` removed → step-0-epic-resolution "Step 0a (review-story) … auto-skips only on the story's own branch" → covered
mutation-proven: uat-status `errors.unshift(...scan.warnings)` → warnings → uat-status.test "--check FAILS on … an unreadable story and an old-shape surface key" → covered
mutation-proven: bug-doc `storyBugParts` artifact / `id === prefix` guard removed → sync-jira-bug "a sub-story bug resolves to its sub-story parent …" → covered (QA2-1)
mutation-proven: ensure-story dedup empty-`STORY_ID` HALT removed → step-0-epic-resolution "every tracker block … binds it ITSELF" → covered (QA2-2)

Four of four are proven. `git status` is unchanged after the checks.

---

## Regression Testing

`ci:fast` 5756 tests, 0 fail. `eval:all`, `bundle:check`, `validate:all` and `lint:shell` all exit 0
at ad9491ec, run with the `.agents/skills` symlink moved aside.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1, CR-2 and CR-3, plus cleanups CR-4 and CR-5: a follow-up. They are listed in the gate's
   `recommendations.future`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every gated finding from cycles 1–2 is fixed and mutation-proven, and this cycle has no
high-confidence bug.
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
