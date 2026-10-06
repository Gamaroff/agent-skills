# QA Report: Task 185 - review-pr eval suite (cycle 8)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.8.review-pr-eval-suite.yml](./task.185.gate.8.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: PASS

---

## Executive Summary

The cycle re-entered QA after `/finalise` run 2 (`task.185.dod.2`) found that the fake `gh` resolved
`pr`/`issue` subcommands by position. The fix (`f728e459`) refuses every command that is not a
served read in an unambiguous shape. 96 directly executed forms and the reviewer's 22 found no write
served, and every review-pr read is still served. The run-2 AC1 gap was closed by an operator
decision, recorded on the criterion: the zsh arm is verified locally, as for task.176.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status |
|---|---|
| DoD run 2, security: `pr`/`issue` subcommand resolved by position (`gh pr --edit-last view comment`) | FIXED (`f728e459`; mutation-proved) |
| DoD run 2, AC1: no CI lane for the zsh arm | RESOLVED by operator decision (criterion annotated) |
| Gate 7 `top_issues` | none |

### Review Methodology

Direct tools plus one read-only code-review subagent. Reviewer dispatched 2026-10-05T19:29:46Z;
completion notice `duration_ms` 190030 (190 s). The reviewer executed 22 argv shapes.

Re-review scope: files changed since gate 7 (head 84506ed6eed3; 5 files outside the work item) — default. `SAFETY_REPROBE=false`: clause 1 false (gate 7 security PASS), clauses 2–3 false.

The first scoped diff came back empty, because zsh passed the newline-joined file list as one
pathspec, which is the trap the skill documents. It was rebuilt with zsh line splitting (5 files,
1034 lines) before the dispatch. Nothing was reviewed against the empty patch.

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[low]** `evals/shared/lib/fake-gh.mjs:298` — `--version` is answered whenever it is `argv[0]`, so
  a longer argv starting with it is answered exit 0 without the shape check. Real gh errors on that
  shape, so nothing posts.
- **[cleanup]** `evals/shared/lib/fake-gh.mjs:306` — `"refused": true` covers both a write and an
  unmodelled read. A reason field would let a failed scenario tell them apart.
- **[cleanup]** `evals/shared/tests/fake-gh.test.mjs:298` — the unhandled test does not assert that
  the log has a line.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: deterministic report number | PASS | Verified | AC1 zsh scope recorded |
| Phase 2: harness extensions | PASS | Verified | fake gh fail-closed for every group |
| Phase 3: the four scenarios | PASS | Verified | replay 4/4; `eval:all` 43 |
| Phase 4: wiring and docs | PASS | Verified | READMEs and CHANGELOG state the rule |

---

## Success Criteria Verification

All 13 pass. AC1's zsh half is verified locally under the operator decision recorded on the
criterion. `ci:fast` 5359 pass / 0 fail.

---

## Breaking Changes Validation

None declared, none found.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

- **C8-CR-1** — `--version` short-circuit is not restricted to a one-element argv.
- **C8-CR-2** — `refused` has no reason field.
- **C8-CR-3** — the unhandled test has no log-line floor.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Every read the review-pr skill and `tracker-comment.js` make is served. The deliberate over-blocks
are documented.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 96
- The 96 forms include all 11 writes the DoD run-2 security agent reproduced (`pr --edit-last view
  comment`, `pr -s view merge`, `pr revert`, `label create`, `repo edit`, …), all refused, and the
  skill's reads (`pr view --json`, `pr diff`, `pr list`, `issue view`, `repo view -q`,
  `api --paginate --jq`, `auth status`, `--version`), all served. The earlier 74-form sets are still
  all correct.

### Maintainability — PASS
One fail-closed rule for all groups.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true` from the pipeline).

**Correctness bugs (1):**
- [low/low] `evals/shared/lib/fake-gh.mjs:298` — the version short-circuit precedes the shape check → answer it only for a one-element argv.

**Cleanups (2):**
- `evals/shared/lib/fake-gh.mjs:306` — add a refusal reason.
- `evals/shared/tests/fake-gh.test.mjs:298` — assert one log line.

None promoted.

**Boundary rule:** `boundary: true` for `runFakeGh`; 96 candidates executed directly.

**Mutation proofs (`f728e459`):**
- mutation-proven: shape check disabled → "pr/issue are served only in an unambiguous read shape…" → covered
- mutation-proven: subcommand adjacency disabled → same test → covered
- mutation-proven: the READS kind check removed → same test → covered

**Provenance (5b):** new to this branch.

**Platform variance:** none.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS (5359 / 0 fail) |
| `npm run eval:all` | PASS (43 scenarios) |
| `evals/shared/tests/*.test.mjs` | PASS (602/602) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
npm run eval:all
command node --test evals/shared/tests/*.test.mjs
command node <scratch>/probe-fgh{,2,4,5}.mjs
```

### Coverage Report

Not measured (no coverage tooling in this repository).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. C8-CR-1..3 and the items carried in the gate's `recommendations.future`, as one harness follow-up task.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding above low, and every NFR passes.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.185.qa.8.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.8.review-pr-eval-suite.yml`
**Next Steps**: Step 5c (PR conformance review), then `/finalise` (run 3).
