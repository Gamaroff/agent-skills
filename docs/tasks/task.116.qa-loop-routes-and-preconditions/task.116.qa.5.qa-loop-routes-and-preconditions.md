# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.5.qa-loop-routes-and-preconditions.yml](./task.116.gate.5.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-14
**Testing Completed**: 2026-09-14
**Gate Status**: FAIL

---

## Executive Summary

Cycle 4's fixes hold: the Action row has a writer on every route, the value set is closed, every consumer points at §5c, and all of it is pinned (30/30). Two things changed between sessions that this cycle has to report. First, the reviewer subagent **failed** on a weekly-quota 429 on 2026-09-13 and was re-dispatched once on the operator's instruction on 2026-09-14 — recorded, not hidden. Second, the branch received release housekeeping (`v0.47.0` header, a `skill-catalog`/`package.json` bump for a `test-it` skill that exists only on `origin/develop`) merged between sessions: the fast gate is now **red** (catalog test, 126 vs 127) and the task's changelog entries are filed under a released version. That is one HIGH by the severity guidelines (critical tests failing) and one MEDIUM, neither attributable to the task's own edits but both on the PR. The task-attributable residue is small and local: a runbook grep that silently prints nothing with two reports, an unspecified `PR Review` value on the escalation arm, and two overlapping qa-flow sentences. Rule 1 → FAIL. HIGH sequence `[0, 2, 0, 1, 1]`.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — merge after CR-2, CR-1, CR-3 close

---

## Re-Review Context

| Cycle-4 issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (c4, HIGH) On-exit never writes the Action row | **FIXED** | post-guard write rule + closed value set (:257–268); On-exit step 1 (:566); dead value gone; pinned; QA mutation (drop PR Review from step 1) → red |
| CR-2 (c4) snippet commands vs comment | **FIXED as filed — but see c5 CR-3** | grep reads the Action row; empty on multi-report |
| CR-3, CR-4, CR-5 (c4) | **FIXED** | ingester :172; review-pr :194/:546; qa-flow row |
| Bug 6 | verified → closed | Bug 2 verified as filed → reopened for CR-3/CR-4 (c5) |

**Re-review scope: since 2026-09-13T09:14:25Z (default narrowing) + the three housekeeping files merged between sessions** — 10 files / 809 diff lines; `SAFETY_REPROBE=false` (gate 4 security `OK reasoned`).

---

## New Findings This Cycle

- **[HIGH]** `package.json:30-31,48`, `docs/reference/skill-catalog.md:251` — reference `skills/test-it` / `evals/test-it`, absent from the branch; `npm run ci:fast` exit 1 → merge `origin/develop`, regenerate the catalog (CR-2, [bug 7](./task.116.bug.7.release-housekeeping-merged-mid-pr.md))
- **[MEDIUM]** `CHANGELOG.md:49` — task-116 bullets under `## [v0.47.0]`; that tag has none of this work → back under `Unreleased` (CR-1, bug 7)
- **[MEDIUM]** `docs/runbooks/task-development.md:183`, `story-development.md:301` — `grep -A8 … | grep '^\*\*Action\*\*'` prints nothing with >1 report (filename prefix defeats `^`) → `grep -h`, state the expected output (CR-3, [bug 2 reopened](./task.116.bug.2.consumer-docs-restate-old-route.md))
- **[LOW]** `develop-pipeline-step-5-6-qa-loop.md:264` — escalation arm's `PR Review` value unspecified → `not reached — gate did not exit the loop` (CR-5, [bug 6 reopened](./task.116.bug.6.on-exit-never-writes-the-action-row.md))
- **[LOW]** `docs/runbooks/qa-flow.md:62,73,97` — Phase 3 lead "CONCERNS or FAIL → qa-fix"; Clean-gate row overlaps route 3; mermaid edge captures active WAIVED (CR-4, CR-6, bug 2)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: routes | CONCERNS | task-attributable residue: one grep flag, one row value, three sentences |
| Phases 2–4 | PASS | Unchanged |
| (PR) housekeeping hunks | FAIL | red suite; misfiled changelog |

## Success Criteria Verification

SC1 CONCERNS (residue above) · SC2 PASS (reviewer 05:34:40 → 05:40:15 UTC; gate 05:46:09; the 09-13 dispatch failed and is recorded) · SC3–5 PASS · SC6 N/A

## Breaking Changes Validation

Consumer Code Updated: Yes for task consumers. **Overall:** PASS for the task; the red suite is CR-2.

## Issues Found

HIGH: 1 (CR-2 → bug 7) · MEDIUM: 2 (CR-1 → bug 7; CR-3 → bug 2) · LOW: 2 (CR-5 → bug 6; CR-4/6 → bug 2)

## NFR Assessment

Performance PASS · **Reliability FAIL** (`ci:fast` TEST_EXIT=1 on `a7c425d3`; green on `009f4587`) · Security PASS (reasoned, `probes_executed: 0`) · Maintainability PASS

---

## Code Review

Reviewer: one read-only Explore subagent over the narrowed diff. **First dispatch 2026-09-13 09:21:59 failed** — API 429 (weekly quota) — per §Subagents "failed"; **re-dispatched once** 2026-09-14 05:34:40 on operator instruction (a quota error learned nothing about the diff), returned 05:40:15 (5 m 35 s; budget 10 m). 6 findings (5 bugs, 1 cleanup); `code_review_blocking=true` promotes bug + high confidence: CR-1, CR-2, CR-3, CR-4 entered by rule; CR-2 **raised to HIGH by QA** — critical tests failing is HIGH by the severity guidelines regardless of the reviewer's rating; CR-5 (low/medium) verified and entered.

**Boundary rule:** `boundary: false`, `probes_executed: 0`. **Platform variance:** n/a. **Step 4b:** no fence changed in the cycle-4 diff; the housekeeping hunks carry no fence.

**Mutation proofs (QA, cycle-4 fix):**
```
mutation-proven: On-exit step 1 dropped the PR Review value → "the Action row the consumers read has a writer on every route" → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on `a7c425d3` | **FAIL** — 3270 / 3268 / 1 fail ("generated catalog is in sync with SKILL.md frontmatter") |
| `npm run ci:fast` on `009f4587` (pre-merge, 2026-09-13) | PASS — 3270 / 3269 / 0 |
| Bundled copies in sync | PASS |
| `pr-review-loop-parity` 30 / `qa-gate-preconditions-parity` 8 | PASS |

---

## Recommendations

### Immediate (Blocking)
1. CR-2 / CR-1 — merge `origin/develop`, regenerate the catalog, suite green; changelog bullets under `Unreleased`.
2. CR-3 — `grep -h`; expected output stated.

### Short-term
CR-5, CR-4/6.

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 50/100 · **Rationale**: rule 1 — one HIGH (red suite), plus reliability FAIL. Task residue is minor and converging; the HIGH is operator housekeeping the PR must nonetheless carry green.

**This is cycle 5 of 5.** After its fix cycle the loop limit is reached; the pipeline's Loop Escalation hands the run to a person with the evidence — which is the designed outcome, not a failure of the work.

**Deployment Recommendation**: BLOCKED · **Conditions**: CR-2, CR-1, CR-3 closed

---

**QA Report**: co-located at `task.116.qa.5.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.5.qa-loop-routes-and-preconditions.yml`
**Next Steps**: `/qa-fix` on gate 5 (cycle 5 of 5) → Loop Escalation (limit) → operator decides on a sixth review
