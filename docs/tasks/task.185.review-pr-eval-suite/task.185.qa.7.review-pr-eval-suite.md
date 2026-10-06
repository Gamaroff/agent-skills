# QA Report: Task 185 - review-pr eval suite (cycle 7)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.7.review-pr-eval-suite.yml](./task.185.gate.7.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: PASS

---

## Executive Summary

After the cycle-6 escalation, the fake `gh` now decides `api` writes by a read allow-list
(`84506ed6`, approved by the user). An `api` call is served only when every flag is a known read flag
and every method given is `GET`. The safety re-probe and 82 directly executed argv forms found no
write served. Bugs 6 and 7 are closed. Two low advisory findings remain.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status |
|---|---|
| TASK-185-C6-CR-1 (bug 6): `-X GET --method POST` served as a read | FIXED (allow-list; mutation-proved) |
| TASK-185-C6-CR-2 (bug 7): `-p`, `--hostname`, `--cache` missing | FIXED (served in the allow-list test) |
| C6-CR-3 (low): field reads under `-X GET` refused | ACCEPTED — documented over-block (fails closed) |
| C6-CR-4 (cleanup): write aliases logged unhandled | FIXED for pr/issue (`new`, `lock`, …) |

### Review Methodology

Direct tools plus one read-only code-review subagent with the SAFETY RE-PROBE directive. Reviewer
dispatched 2026-10-05T18:59:07Z; completion notice `duration_ms` 301984 (302 s). The reviewer
reasoned from reading the code and executed no candidates. QA executed the surface directly instead
(see Security).

Re-review scope: unscoped (prior gate failed on security) — `origin/develop...HEAD`, 6519 lines after the `*/references/*` exclusion.

Loop context: the lock was restored by `grant-qa-cycles.sh` (2 extra cycles, `qa_max_cycles=8`)
after the cycle-6 convergence halt.

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[low]** `evals/shared/lib/fake-gh.mjs:46` — writes outside `pr`/`issue` (`release create`,
  `repo edit`, `workflow run`, …) are logged `unhandled`, not `refused`. The scenario still fails on
  the no-unhandled assertion. Executed: all three logged as not-a-read.
- **[low]** `evals/shared/lib/fake-gh.mjs:98` — `API_READ_FLAGS` allows `-R`/`--repo`, which real
  `gh api` rejects, so a read broken on real gh would pass in the fake.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: deterministic report number | PASS | Verified | unchanged |
| Phase 2: harness extensions | PASS | Verified | fake gh allow-list |
| Phase 3: the four scenarios | PASS | Verified | replay 4/4; `eval:all` 43 |
| Phase 4: wiring and docs | PASS | Verified | README states the allow-list |

---

## Success Criteria Verification

Unchanged from gate 4: all 13 pass. The harness change keeps the four scenarios green in replay. They
serve no `api` fixture, so their live behaviour is unchanged.

---

## Breaking Changes Validation

None declared, none found.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **C7-CR-1** — write commands outside `pr`/`issue` are labelled `unhandled`.
- **C7-CR-2** — `-R`/`--repo` is allowed on `api`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Reads with `--hostname`, `-p` and `--cache` are served. Two real reads are refused by design and
documented: `--method POST -X GET`, and `-X GET` with a field flag.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 82
- Executed directly against `runFakeGh` at `84506ed6`. The forms cover: separators (`--`), global
  flags before the group, positional confusion, graphql mutations (`-f`, `-F`, `--input`), method
  case and empty method, glued and clustered forms, write subcommands, and the review-pr skill's real
  reads. No write was served. One expectation of mine was wrong: `pr --repo comment view 901` is a
  read to real `gh` too, since `--repo` takes `comment`. The probe engine has no sink for gh argv.

### Maintainability — PASS
One allow-list replaces three deny-list patches, and the rule is stated in the header and the
README.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true` from the pipeline).

**Correctness bugs (2):**
- [low/medium] `evals/shared/lib/fake-gh.mjs:46` — the write list is hand-written; other groups' writes log `unhandled` → refuse every command not in READS.
- [low/medium] `evals/shared/lib/fake-gh.mjs:98` — `-R`/`--repo` allowed on `api` → drop them.

**Cleanups (0).**

None promoted (no `bug` + `confidence: high`).

**Boundary rule:** `boundary: true` for `evals/shared/lib/fake-gh.mjs#runFakeGh`; 82 candidates executed directly.

**Mutation proofs (this cycle's fix, `84506ed6`):**
- mutation-proven: flag allow-list removed → "api is served only by the read allow-list…", the cluster, glued and every-write tests → covered
- mutation-proven: method read through `get()` precedence → the allow-list test → covered
- mutation-proven: the `new` alias removed → the allow-list test → covered

**Provenance (5b):** new to this branch (`fake-gh.mjs` is not on `origin/develop`).

**Platform variance:** none.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | 5358 pass / 1 fail: `test-clean-checkout` LOAD-SENSITIVE (32 s against 10 s at load average 86); 13/13 alone |
| `npm run eval:all` | PASS (43 scenarios) |
| `evals/shared/tests/*.test.mjs` | PASS (601/601) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
command node --test tests/test-clean-checkout.test.js
npm run eval:all
command node --test evals/shared/tests/*.test.mjs
command node <scratch>/probe-fgh.mjs <scratch>/probe-fgh2.mjs <scratch>/probe-fgh3.mjs <scratch>/probe-fgh4.mjs
```

### Coverage Report

Not measured (no coverage tooling in this repository).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. C7-CR-1: refuse every command not in READS.
2. C7-CR-2: drop `-R`/`--repo` from `API_READ_FLAGS`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding above low, and every NFR passes.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.185.qa.7.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.7.review-pr-eval-suite.yml`
**Next Steps**: Step 5c (PR conformance review), then `/finalise`.
