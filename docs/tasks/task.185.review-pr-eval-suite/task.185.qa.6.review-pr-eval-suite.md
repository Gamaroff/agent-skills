# QA Report: Task 185 - review-pr eval suite (cycle 6)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.6.review-pr-eval-suite.yml](./task.185.gate.6.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Executive Summary

The cycle-5 fix holds: short-flag clusters are read as pflag reads them, and all 46 direct probe
forms are correct. The safety re-probe found the next spelling of the same defect. `-X` and
`--method` are one flag to `gh` and two to the fake, so `gh api -X GET --method POST` is served as a
read. It is the third consecutive defect in the fake's argv deny-list, which points at the mechanism
rather than another patch.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Status |
|---|---|
| TASK-185-C5-CR-1 (bug 5): short-flag clusters served as reads | FIXED (`61226c7c`; 46 forms correct; mutation-proved) |

### Review Methodology

Direct tools plus one read-only code-review subagent with the SAFETY RE-PROBE directive. Reviewer
dispatched 2026-10-05T17:58:23Z; completion notice `duration_ms` 150430 (150 s).

Re-review scope: unscoped (prior gate failed on security) — `origin/develop...HEAD`, 53 files, 5904 lines after the `*/references/*` exclusion.

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `evals/shared/lib/fake-gh.mjs:219` — the method is read as `get("-X", "--method")`, so
  the last `-X` outranks any `--method`. pflag reads the two as one flag where the last one wins.
  `-X GET --method POST` and `-XGET --method=DELETE` are served as reads. Reproduced.
  [task.185.bug.6.fake-gh-method-spellings-last-wins.md](./task.185.bug.6.fake-gh-method-spellings-last-wins.md)
- **[medium]** `evals/shared/lib/fake-gh.mjs:101` — `VALUE_FLAGS` omits `-p`/`--preview`,
  `--hostname` and `--cache`, so real reads with them come back `notFound`. Reproduced.
  [task.185.bug.7.fake-gh-api-value-flags-missing.md](./task.185.bug.7.fake-gh-api-value-flags-missing.md)
- **[low]** `evals/shared/lib/fake-gh.mjs:220` — field flags under an explicit `-X GET`, and graphql
  query documents, are real reads that the fake refuses. Reproduced for `-X GET … -f per_page=100`.
- **[cleanup]** `evals/shared/lib/fake-gh.mjs:44` — `pr new`, `issue new`, `pr lock`,
  `pr update-branch`, `issue pin` and `issue develop` are writes logged `unhandled`, not `refused`.
  Reproduced for `pr new` and `issue new`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: deterministic report number | PASS | Verified | unchanged |
| Phase 2: harness extensions | FAIL | Partial | the fake gh write refusal (bug 6) |
| Phase 3: the four scenarios | PASS | Verified | replay 4/4; `eval:all` 43 scenarios |
| Phase 4: wiring and docs | PASS | Verified | |

---

## Success Criteria Verification

Unchanged from gate 4. `ci:fast` 5357 pass / 0 fail; `eval:all` passes; `evals/shared` 600/600.

---

## Breaking Changes Validation

None declared, none found.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: -X and --method read as two flags (TASK-185-C6-CR-1)**
- **Severity**: HIGH
- **Category**: Security (eval harness boundary)
- **Bug Report**: [task.185.bug.6.fake-gh-method-spellings-last-wins.md](./task.185.bug.6.fake-gh-method-spellings-last-wins.md)
- **Observation**: `gh api -X GET --method POST <served path>` exits 0 as a read.
- **Impact**: a "never posts" assertion passes on a run that tried to post, for any scenario serving an `api` path.
- **Recommendation**: allow-list api reads instead of deny-listing writes.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: three gh api value flags missing (TASK-185-C6-CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional (eval harness)
- **Bug Report**: [task.185.bug.7.fake-gh-api-value-flags-missing.md](./task.185.bug.7.fake-gh-api-value-flags-missing.md)
- **Observation**: `gh api --hostname github.com <served path>` returns `notFound`.
- **Impact**: a correct skill read fails the scenario for a harness reason.
- **Recommendation**: add the flags, checked against `gh api --help`.
- **Priority**: P2

### LOW Severity Issues (1)

- **C6-CR-3** — field-flag reads under `-X GET` and graphql queries are refused (over-blocking).

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
Bug 7 and C6-CR-3: real reads the fake answers wrongly.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 83
- 46 forms were executed directly at `61226c7c`, all correct, and the reviewer executed 37 in memory.
  One write bypass reproduces (bug 6). The probe engine has no sink for gh argv classification.

### Maintainability — CONCERNS
Three consecutive cycles have patched the same argv deny-list (glued flags, clusters, flag aliases).
Each fix was correct and exposed the next spelling.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true` from the pipeline).

**Correctness bugs (3):**
- [high/high] `evals/shared/lib/fake-gh.mjs:219` — `-X` outranks `--method`; pflag's last-wins makes `-X GET --method POST` a write → store both under one key, or allow-list reads. **Promoted to gate as TASK-185-C6-CR-1.**
- [medium/high] `evals/shared/lib/fake-gh.mjs:101` — `-p`/`--preview`, `--hostname`, `--cache` missing from `VALUE_FLAGS` → add them. Entered in the gate as TASK-185-C6-CR-2 (QA-raised, medium).
- [low/medium] `evals/shared/lib/fake-gh.mjs:220` — field flags under `-X GET` and graphql queries are refused → treat fields as a write only without an explicit GET.

**Cleanups (1):**
- `evals/shared/lib/fake-gh.mjs:44` — write aliases (`pr new`, `issue new`, …) log `unhandled` → list them from `gh pr --help` / `gh issue --help`.

**Boundary rule:** `boundary: true` for `evals/shared/lib/fake-gh.mjs#runFakeGh`. 83 candidates were executed directly; one write bypass reproduced.

**Mutation proofs (this cycle):**
- mutation-proven: cluster walk limited to the first character → `fake-gh.test.mjs` "a short-flag cluster is read as gh reads it…" → covered
- mutation-proven: cluster branch removed → the cluster test and "a glued short value flag is still a write…" → covered

**Provenance (5b):** `fake-gh.mjs` does not exist on `origin/develop`, so all findings are new to this
branch.

**Platform variance:** none.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS (5357 / 0 fail, 1 skipped) |
| `npm run eval:all` | PASS (43 scenarios) |
| `evals/shared/tests/*.test.mjs` | PASS (600/600) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
npm run eval:all
command node --test evals/shared/tests/*.test.mjs
command node <scratch>/probe-fgh.mjs <scratch>/probe-fgh2.mjs <scratch>/probe-fgh3.mjs
```

### Coverage Report

Not measured (no coverage tooling in this repository).

---

## Recommendations

### Immediate Actions (Blocking)

1. Replace the fake gh's write deny-list with a read allow-list (bug 6), then add the missing value flags (bug 7).

### Short-term Actions (Non-Blocking)

1. C6-CR-3 and C6-CR-4, plus the items carried in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence correctness bug in the harness's write refusal (rule 1).
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.185.qa.6.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.6.review-pr-eval-suite.yml`
**Next Steps**: the QA loop has stopped converging (HIGH 1, 1 on cycles 5–6) and the granted budget is spent. Escalated; see the implementation report.
