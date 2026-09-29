# QA Report: Task 129 - A call-site list in a task document is the author's recall, not a measurement (cycle 3)

**Task**: [Link to task document](./task.129.review-call-site-population-check.md)
**Gate File**: [task.129.gate.3.review-call-site-population-check.yml](./task.129.gate.3.review-call-site-population-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-129-C2-CR-1 consumer `scripts/` read as measurable | FIXED | consumer tree → `no-roots`; mutation → red |
| TASK-129-C2-CR-2 exit 1 also meant a crash | PARTIAL | prototype names → `usage` (2); but an EPIPE still exits 1 (C3-CR-1) |
| C2-CR-3/4/5/6 (advisory) | FIXED | limits stated; `unreadable`; CHANGELOG |

## Review Methodology

Cycle 3: diff scoped to cycle 2's fix (`a7f2342a..a65b1737`, 6 files, 580 lines), with the collector read in full. Re-review scope: since gate 2 (default).

## New Findings This Cycle

- **[medium]** `shared/resources/call-sites.js:465` — C3-CR-1: EPIPE on stdout exits 1 (reproduced 3/3 with `| (exit 0)`).
- **[medium]** `shared/resources/tests/call-sites.test.mjs:454` — C3-CR-2: the every-row test covers 4 of 6 rows and does not assert coverage of `REASONS`.
- **[low]** `shared/resources/call-sites.js:392` — C3-CR-3: `--root` stat EACCES reads as `usage`.
- **[low]** `skills/review-task/SKILL.md:953` — C3-CR-4: the checks omit "over-counted" and exit 4.
- **[cleanup]** `shared/resources/call-sites.js:214` — C3-CR-5: unused `ROOTS` export.

Provenance: all in this branch's code.

## Implementation Verification

Phase 1 CONCERNS (C3-CR-1, C3-CR-2). Phase 2 PASS — check texts identical apart from number, indent and skill path (reviewer-verified).

## Success Criteria Verification

Populations equal to the guard: tracker-comment 24, stakeholder-summary-cli 12. `call-sites.test.mjs` 28/28, guard 14/14.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3 (advisory)

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged.

### Reliability — CONCERNS · Performance — PASS · Maintainability — PASS

## Code Review

`code_review_blocking=true`; C3-CR-1 and C3-CR-2 promoted. The reviewer reports one unrequested write: an EPIPE reproduction wrote its stderr to the (now-expired) session scratchpad, outside the repository.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on C3-CR-1, C3-CR-2.
