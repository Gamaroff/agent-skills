# QA Report: Task 129 - A call-site list in a task document is the author's recall, not a measurement (cycle 4)

**Task**: [Link to task document](./task.129.review-call-site-population-check.md)
**Gate File**: [task.129.gate.4.review-call-site-population-check.yml](./task.129.gate.4.review-call-site-population-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-129-C3-CR-1 EPIPE exits 1 | FIXED | `| (exit 0)` → exit 5 (`output-closed`); mutation (no guards) → red |
| TASK-129-C3-CR-2 every-row test drives 4 of 6 | FIXED | drivers asserted equal to `REASONS` keys; 7/7 driven; dropped driver → red |
| C3-CR-3/4/5 (advisory) | FIXED | `--root` EACCES → unreadable (test); prose; `ROOTS` removed |

## Review Methodology

Cycle 4: diff scoped to cycle 3's fix (`a65b1737..c32d933d`, 7 files, 345 lines), with the collector and the every-row test read in full. Re-review scope: since gate 3 (default).

## New Findings This Cycle

- **[medium/medium — advisory]** `shared/resources/review-task-prepass-prompts.md:68` — C4-CR-1: four prose sites hand-list the non-zero reasons, omit `usage`, and no test ties the lists to `REASONS`.
- **[low]** `shared/resources/call-sites.js:481` — C4-CR-2: `installExitGuards`' uncaught and non-EPIPE arms have no direct test.
- **[low]** `shared/resources/tests/call-sites.test.mjs:563` — C4-CR-3: the output-closed driver has no error/timeout path (ordering itself is deterministic).

None is a high-confidence correctness bug, so none enters `top_issues` under `code_review_blocking`. All three go to `recommendations.future` and are visible to 5c.

## Implementation Verification

Phase 1 PASS, Phase 2 PASS (check bodies identical apart from number and skill path — reviewer-verified).

## Success Criteria Verification

All met. Populations: tracker-comment 24, stakeholder-summary-cli 12 (equal to the guard), gh-stage 13, jira-stage 18, tracker-issue 30. CLI sub-second.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 blocking (1 advisory), LOW: 2

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged.

### Reliability — PASS · Performance — PASS · Maintainability — PASS

## Test Artifacts

```bash
npm run ci:fast   # 4,576 pass, 0 fail (cycle-3 fix gate)
node --test shared/resources/tests/call-sites.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs   # 43/43
```

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: APPROVED — proceeds to 5c (PR conformance review).
