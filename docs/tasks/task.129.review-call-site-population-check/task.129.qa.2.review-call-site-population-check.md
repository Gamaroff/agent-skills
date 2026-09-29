# QA Report: Task 129 - A call-site list in a task document is the author's recall, not a measurement (cycle 2)

**Task**: [Link to task document](./task.129.review-call-site-population-check.md)
**Gate File**: [task.129.gate.2.review-call-site-population-check.yml](./task.129.gate.2.review-call-site-population-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-129-CR-1 explicit `--root` widened to the repo top | FIXED | CR-1 test; mutation → red |
| TASK-129-CR-2 `node "$VAR"` invisible | FIXED | `setup-consumer.sh:614` counted for gh-stage and jira-stage, `:1213` excluded; mutation → red |
| CR-3..CR-7 (advisory) | FIXED (CR-7 PARTIAL) | tests for CR-4/5/6; CR-3 closed by the CR-1 fix; CR-7: comment reworded, but the `c69f5115^` fixture was **not** committed as a test — corrected after PR review 1 (PC-1) |

## Review Methodology

Cycle 2: whole-branch diff, **refute pass** (Step 3b), by a reviewer that did not write the fixes. Re-review scope: unscoped (cycle 2 is always a full refute pass).

## New Findings This Cycle

- **[medium]** `shared/resources/call-sites.js:170` — C2-CR-1: `hasRoots()` accepts a bare `scripts/`, so a consumer install answers `empty` instead of `no-roots` → base the marker on `shared/resources/` plus a `skills/*/SKILL.md`. Reproduced.
- **[medium]** `shared/resources/call-sites.js:313` — C2-CR-2: `--engine toString` throws (exit 1, no JSON) and read errors are uncaught, so exit 1 does not only mean `no-roots` → `Object.hasOwn`; catch read errors under their own reason. Reproduced.
- **[low]** `shared/resources/call-sites.js:188` — C2-CR-3: the comment says "most recent assignment decides", the code accumulates; `.md` fenced blocks share one variable set.
- **[low]** `shared/resources/call-sites.js:213` — C2-CR-4: a top-level engine variable used inside a later function is missed.
- **[low]** `shared/resources/call-sites.js:111` — C2-CR-5: an unreadable root directory reads as empty.
- **[cleanup]** `CHANGELOG.md:12` — C2-CR-6: the contract summary lacks `no-roots`.

Provenance: all in code added on this branch (cycle 1's fixes).

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: `call-sites.js` | CONCERNS | C2-CR-1, C2-CR-2 |
| Phase 2: The review check | PASS | `no-roots` sentence identical in both checks; presence test green |

## Success Criteria Verification

All criteria from cycle 1 still met. Populations: tracker-comment 24, stakeholder-summary-cli 12 (unchanged); gh-stage 13, jira-stage 18 (+1 each: `setup-consumer.sh:614`); tracker-issue 30.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 4 (advisory)

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged: the collector is a measurement whose result gates no action. Re-checked candidates: `hasRoots`, `viaVariable`/`engineVarsByLine`.

### Reliability — CONCERNS
C2-CR-1 and C2-CR-2 each make the documented reason/exit contract false.

### Performance — PASS · Maintainability — PASS

## Code Review

`code_review_blocking=true`; C2-CR-1 and C2-CR-2 promoted to `top_issues`.

mutation-proven: 6 cycle-1 fixes each reverted → the named `call-sites.test.mjs` test went red → covered

## Test Artifacts

```bash
node --test shared/resources/tests/call-sites.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs   # 37/37
npm run ci:fast   # 4,570 pass, 0 fail (cycle-1 fix gate)
```

Step 4b: the changed prose adds one sentence to an existing list item and no new fenced block; re-run not needed beyond cycle 1's result.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on C2-CR-1, C2-CR-2.
