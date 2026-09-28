# QA Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Gate File**: [task.154.gate.5.bundler-and-snippet-test-hygiene.yml](./task.154.gate.5.bundler-and-snippet-test-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 was a scoped re-review at `1b245db7`. The cycle-4 test assertions are no longer vacuous: J1
and J2 are mutations the old assertions let through, and each now turns tests red. The spec prose now
describes the per-run design. The scoped review found no correctness defect, only four low-severity
cleanups, which are recorded as future recommendations.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T154-QA4-1: base-kept checks were vacuous | MEDIUM | FIXED | `entries()` throws on a missing base, and J1 reds 4 tests ([bug 7](./task.154.bug.7.runner-test-base-kept-vacuous.md), closed) |
| T154-QA4-2: relative-base case could not discriminate | MEDIUM | FIXED | The case runs from a subdirectory, and J2 reds it ([bug 8](./task.154.bug.8.runner-test-relative-base-cannot-discriminate.md), closed) |
| T154-QA4-3: spec text lagged the code | LOW | FIXED, with two residual nits (CR-3 below) | §3, Phase 5 and risk note 2 were rewritten |
| T154-QA4-4: the guard checked one spelling | LOW | FIXED | The guard now checks the `/private/var` spelling too |

---

## Testing Scope

### Review Methodology

Direct tools plus one scoped reviewer, over the 9 files changed since gate 4.

Re-review scope: since 2026-09-28T22:47:20Z (default). The runner changed by one control-character
check, so no by-hand re-probe was needed. Cycle 4's 16-candidate probe still covers the deletion
surface. Step 4b does not apply.

---

## New Findings This Cycle

These are advisory cleanups only. None is entered in `top_issues`.

- `scripts/test-clean-checkout.sh:67`: the resolved-path control-character refusal is never reached
  by a test (CR-1).
- `tests/test-clean-checkout.test.js:317`: the concurrency case resolves the base with the JS
  realpath while the runner uses `.native`. On a case-varied macOS path this is a theoretical false
  red (CR-2, confidence low).
- Task doc: §3 says the base "is repo-local"; only the default is. The Phase 5 refusal criterion
  lists fewer refusals than the script makes (CR-3).
- `tests/test-clean-checkout.test.js:269`: the created-base block duplicates the first block of the
  relative-base case (CR-4).

---

## NFR Assessment

- **Performance — PASS**
- **Reliability — PASS**
- **Security — PASS.** Evidence: measured. Probes executed: 16, from cycle 4; this cycle made no
  deletion-path change.
- **Maintainability — PASS.** The four cleanups are advisory.

---

## Code Review

- Correctness bugs: 0
- Cleanups: 4 (CR-1 to CR-4), recorded under `recommendations.future`

**Mutation spot check:**

- mutation-proven: trap also removes an empty base → 4 runner tests → covered (J1)
- mutation-proven: relative base resolved against the repository → relative-base case → covered (J2)

**Platform variance:** `TMPDIR=/tmp node --test tests/test-clean-checkout.test.js` → 11/11.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Next Steps**: Step 5c `/review-pr`.
