# QA Report: Task 185 - review-pr eval suite (cycle 5)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.5.review-pr-eval-suite.yml](./task.185.gate.5.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Executive Summary

The cycle re-entered QA after `/finalise` (`task.185.dod.1`) found that the fake `gh` served a glued
short-flag write (`-XPOST`, `-fbody=x`) as a read. The fix (`9ee9f21a`) closes those forms and is
mutation-proved. Probing the boundary again found the same defect in a second form: a shorthand
cluster that starts with a boolean flag (`-iXPOST`) is still served as a read. The code review found
it independently, high/high.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Status |
|---|---|
| `/finalise` DoD security gap: glued `-XPOST` / `-fbody=x` served as a read | FIXED (`9ee9f21a`; mutation-proved) |
| Gate 4 `top_issues` | none |

### Review Methodology

Direct tools plus one read-only code-review subagent (Step 3b). Re-entry from a `/finalise` DoD-gaps
halt through `reenter-qa-after-finalise.sh` (gate head `2064ee43`, 1 commit outside the work item).
Reviewer dispatched 2026-10-05T17:43:02Z; completion notice `duration_ms` 96213 (96 s).

Re-review scope: files changed since gate 4 (head 2064ee43a793; 3 code/doc files outside the work item: `evals/shared/lib/fake-gh.mjs`, `evals/shared/tests/fake-gh.test.mjs`, `evals/shared/README.md`) — default. `SAFETY_REPROBE=false`: clause 1 false (gate 4 security PASS), clauses 2–3 false (no top issue, gate PASS).

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `evals/shared/lib/fake-gh.mjs:139` — `parseArgs` reads a shorthand cluster that starts
  with a boolean flag as one boolean flag. On a served `api` path, `-iXPOST` and `-ifb=x` are
  answered as reads (exit 0), and `-iX POST` / `-if b=x` come back `notFound`. None of them is logged
  `refused`. → Walk the cluster as pflag does. [task.185.bug.5.fake-gh-shorthand-cluster-write.md](./task.185.bug.5.fake-gh-shorthand-cluster-write.md)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: deterministic report number | PASS | Verified | unchanged since gate 4 |
| Phase 2: harness extensions | FAIL | Partial | TASK-185-C5-CR-1 in `fake-gh.mjs` |
| Phase 3: the four scenarios | PASS | Verified | replay 4/4 after the fix |
| Phase 4: wiring and docs | PASS | Verified | README sentence added with the fix |

---

## Success Criteria Verification

Unchanged from gate 4 except where the fix touches the harness: `eval:review-pr` replay 4/4;
`evals/shared/tests/*.test.mjs` 599/599; `fake-gh.test.mjs` 9/9. No live run logs a refused or
unhandled call (no live run this cycle; the fake's refusal itself is the open finding).

---

## Breaking Changes Validation

None declared, none found.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the fake gh serves a combined shorthand write as a read (TASK-185-C5-CR-1)**
- **Severity**: HIGH
- **Category**: Security (eval harness boundary)
- **Bug Report**: [task.185.bug.5.fake-gh-shorthand-cluster-write.md](./task.185.bug.5.fake-gh-shorthand-cluster-write.md)
- **Observation**: `gh api -iXPOST <served path>` exits 0 as a read; 4 of 31 probed forms are wrong.
- **Impact**: a "never posts" assertion passes on a run that tried to post, for any scenario serving an `api` path. Latent in the review-pr suite.
- **Recommendation**: parse shorthand clusters as pflag does.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (0)

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Unchanged since gate 4.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31
- The fake `gh`'s write refusal is a boundary on agent-chosen argv. 31 forms were executed directly
  against `runFakeGh` with a served `api` fixture: reads (plain, `-XGET`, `--method=get`, `-i`,
  `--paginate`) are served, and every separated, `=`-joined and glued write form is refused. The
  four shorthand clusters are not. `security-probe.mjs` cannot reach this entry: no corpus sink
  models gh read/write classification, and `runFakeGh` returns no `ok` field. So the probes ran
  through a direct harness. The four failing forms go into the committed test with the fix.

### Maintainability — PASS
The fix is a small `parseArgs` branch with a committed, mutation-proved test.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true` from the pipeline).

**Correctness bugs (1):**
- [high/high] `evals/shared/lib/fake-gh.mjs:139` — a shorthand cluster that starts with gh api's boolean `-i` is read as one boolean flag, so `-iXPOST` / `-ifbody=x` are served as reads and `-iX POST` turns POST into the lookup key; none logs refused → walk the cluster as pflag's `parseShortArg` does, add the forms to the test, and soften the README sentence until clusters are covered. **Promoted to gate as TASK-185-C5-CR-1** (the same defect the direct probes reproduced).

**Cleanups (0).**

**Boundary rule:** `boundary: true` for `evals/shared/lib/fake-gh.mjs#runFakeGh` (it refuses writes on
agent-chosen argv). 31 candidates were executed directly, with 4 wrong, as above.

**Mutation proofs (this cycle):**
- mutation-proven: glued-flag split disabled (`if (false)`) → `fake-gh.test.mjs` "a glued short value flag is still a write, even on a path a fixture serves" → covered (8 pass / 1 fail; restored 9/9)

**Provenance (5b):** `fake-gh.mjs` does not exist on `origin/develop`, so the finding is new to this
branch.

**Platform variance:** none. The test passes no environment-derived path to a validating consumer.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `evals/shared/tests/*.test.mjs` | PASS (599/599) |
| `eval:review-pr` replay | PASS (4/4) |
| `npm run ci:fast` | see the implementation report's QA Cycle 5 entry |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test evals/shared/tests/fake-gh.test.mjs
command node --test evals/shared/tests/*.test.mjs
npm run eval:review-pr
npm run ci:fast
command node <scratch>/probe-fgh.mjs   # 31 argv forms against runFakeGh, served api fixture
```

### Coverage Report

Not measured (no coverage tooling in this repository).

---

## Recommendations

### Immediate Actions (Blocking)

1. Fix TASK-185-C5-CR-1 (BUG-5): parse shorthand clusters as pflag does.

### Short-term Actions (Non-Blocking)

1. Carried from gate 4 (`recommendations.future`).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence correctness bug in the harness's write refusal (rule 1).
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.185.qa.5.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.5.review-pr-eval-suite.yml`
**Next Steps**: `/qa-fix` for TASK-185-C5-CR-1; re-review in cycle 6 (the last in the granted budget).
