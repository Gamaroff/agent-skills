# QA Report: Task 186 - Eval harness hardening and task.185 leftovers (cycle 3)

**Task**: [Link to task document](./task.186.eval-harness-hardening-and-leftovers.md)
**Gate File**: [task.186.gate.3.eval-harness-hardening-and-leftovers.yml](./task.186.gate.3.eval-harness-hardening-and-leftovers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-06
**Testing Completed**: 2026-10-06
**Gate Status**: CONCERNS (no open entry — the one finding was carried by route 2)

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| C2-CR-1 (medium) — jq refusal fired under replay | FIXED | `583983f`; `PATH`={`node`,`git`} `DRIVER=replay` review-pr 01-happy → `5/5 assertions passed`, exit 0 (was `skipped`); 3/3 mutations killed |
| C2-CR-2, -3, -5, -6, -7 (advisory) | FIXED alongside | docstring, README exit-2 row, A5 test split, one `jqAvailable()`, meta-test path and cleanup |
| C2-CR-4 (advisory) | NOT FIXED | still in `recommendations.future` |

---

## Executive Summary

Gate 2's regression is fixed and proven: a replay run without `jq` is judged again, and a live run
without `jq` still skips. The scoped cycle-3 review found one test-strength defect in the new
no-jq meta-test. With HIGH at 0 for cycles 2 and 3 and that finding in test machinery, the loop's
route classifier takes the **Diminishing-returns exit**; the finding is carried, not fixed.

**Overall Assessment**: CONCERNS (empty open queue)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head 3c7b6b8748e3; 12 files) — default

One independent Explore reviewer over that scoped patch (dispatched 06:28:32 UTC, `duration_ms`
102105). `SAFETY_REPROBE=false`. Uncommitted tracked changes outside the work item: none. Step 4b:
no SKILL.md changed since gate 1.

---

## New Findings This Cycle

- **[medium/high]** `evals/shared/tests/fake-gh.test.mjs:530` — C3-CR-1: the no-jq meta-test's
  `/^# skipped [1-9]/` always holds because the child skips the meta-test itself, and it has no pass
  floor, so it would pass a regression that skipped every install test under replay → assert the
  `-q/--jq` test by name as a SKIP and add a pass floor. **Entered `top_issues`, then carried by
  route 2** (`recommendations.future`, `status: closed`).
- **[cleanup]** `evals/shared/tests/runner-setup.test.mjs:320` — C3-CR-2: a stale two-line A5
  comment sits above the scoped tests and contradicts them. Advisory.
- **[cleanup]** `evals/shared/tests/fake-gh.test.mjs:394` — C3-CR-3: `jqTest` now gates on
  `installRefuses`, so the name misleads. Advisory.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 (A1–A6) | PASS | A5 scoped; replay judged, live skips |
| Phase 2 (B) | PASS | 33-form probe on this head, 0 mismatches |
| Phase 3 (C) | PASS | unchanged |
| Phase 4 (D) | PASS | unchanged since gate 2 |

---

## Success Criteria Verification

All functional, code-quality and migration criteria — PASS (unchanged from gate 1, with A5 now
scoped as intended: could-not-run only where `jq` is actually needed).

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (1, carried)
C3-CR-1 — test machinery; carried to `recommendations.future` by route 2.
### LOW Severity Issues (0)

**Total Issues (gate, open)**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
The `gh` launcher imports only `driver-name.mjs`.
### Reliability — PASS
Replay judged without `jq`; live skips; review-pr replay evals 4/4 on this head.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30 (`next_numbered` unchanged since gate 2; `task.186.qa.2.security.run.json` `totals.executed`). Fake `gh` classifier 33/33 on this head.
### Maintainability — PASS

---

## Code Review

Findings above. Promoted: C3-CR-1 (medium/high, `code_review_blocking`). Provenance: new to this
change (the meta-test was added in cycle 1).

**Loop exit**: Diminishing-returns exit taken — HIGH is 0 for cycles 2 and 3, and all 1 remaining findings are in test machinery — the loop has finished working rather than stopped working. This is a CLEAN exit, not a stall: nothing was blocked and nothing is being accepted over. The residue is recorded in the gate's `recommendations.future`.

**Mutation proofs (cycle 2 fix, on the committed head):**
- mutation-proven: refuse without jq under every driver → runner-setup "a replay run without jq installs the fake gh and is judged" → covered
- mutation-proven: never refuse → runner-setup "a live run without jq is a skip naming jq" → covered
- mutation-proven: refuse without jq under every driver → fake-gh "the suite skips, never fails, on a host without jq" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Targeted suites (6 files) | 394/394 |
| `TMPDIR=/tmp` fake-gh + runner-setup | 34/34 |
| `npm run eval:review-pr` (replay) | 4/4 |
| PR CI at `583983f` | test pending; link-check, shellcheck, validate pass |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test evals/shared/tests/{runner-setup,repeat,fake-gh}.test.mjs \
  shared/resources/tests/{pr-inline-comment,next-numbered}.test.mjs skills/review-pr/tests/review-pr.test.js   # 394/394
TMPDIR=/tmp command node --test evals/shared/tests/fake-gh.test.mjs evals/shared/tests/runner-setup.test.mjs  # 34/34
npm run eval:review-pr                                                                                         # 4/4
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. C3-CR-1 — named SKIP check and pass floor for the no-jq meta-test (carried, route 2).
2. C3-CR-2, C3-CR-3; earlier advisories in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS — no open entry; the loop exits through route 2 to 5c
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.186.qa.3.eval-harness-hardening-and-leftovers.md`
**Gate File**: co-located at `task.186.gate.3.eval-harness-hardening-and-leftovers.yml`
**Next Steps**: Step 5c — `/review-pr` over PR #576.
