# QA Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Gate File**: [task.154.gate.4.bundler-and-snippet-test-hygiene.yml](./task.154.gate.4.bundler-and-snippet-test-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 was a scoped re-review at `480782e4`. It checked the per-run redesign of the clean-checkout
runner. The redesign closes every cycle-3 finding. The review found no runner defect, and a 16-candidate
by-hand re-probe changed nothing on disk except creating an empty base, which is by design. The
remaining issues are two test assertions that pass vacuously and spec text that still describes the
design the runner replaced.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T154-QA3-1: stale-lock takeover race | MEDIUM | FIXED (the mechanism was removed) | There is no lock. Each run creates its own `mktemp -d` directory, and the concurrency test passes |
| T154-QA3-2: ownership checked before the lock | MEDIUM | FIXED (the mechanism was removed) | There is no ownership check. The runner deletes only its own `run.*` |
| QA3-3 to QA3-6 (LOW) | LOW | FIXED | The pid-less lock, the marker, the lock path and the dangling symlink no longer apply. By hand: a dangling symlink as the base is refused and nothing is deleted |

---

## Testing Scope

### Review Methodology

Direct tools and one scoped reviewer, working from the files changed since gate 3
(`2026-09-28T22:35:18Z`).

Re-review scope: since 2026-09-28T22:35:18Z (default). The runner was rewritten, so it was re-probed
by hand. Step 4b does not apply: no `SKILL.md` or shared `.md` is in scope.

---

## New Findings This Cycle

- **[medium]** `tests/test-clean-checkout.test.js:316` — `entries()` returns `[]` both for a missing
  directory and for an empty one, so the base-is-empty checks pass even when the base was deleted
  (T154-QA4-1, [bug 7](./task.154.bug.7.runner-test-base-kept-vacuous.md)).
- **[medium]** `tests/test-clean-checkout.test.js:322` — the relative-base case runs from the repo's
  top level, so it cannot tell "resolved against the invoking directory" from "resolved against the
  repo" (T154-QA4-2, [bug 8](./task.154.bug.8.runner-test-relative-base-cannot-discriminate.md)).
- **[low]** The task's §3, the Phase 5 criterion and risk note 2 still say "removes the clone at start
  and on exit" (T154-QA4-3).
- **[low]** `tests/test-clean-checkout.test.js:51` — the scratch-base guard checks one spelling of the
  path; the runner checks two (T154-QA4-4).
- Cleanups: CR-5 applies the control-character check to the resolved path; CR-6 has the concurrency
  case assert that the two runs used different run directories.

---

## NFR Assessment

- **Performance — PASS**
- **Reliability — PASS.** The shared-location class of defect is gone by construction.
- **Security — PASS.** Evidence: measured, by hand under §5.1. Probes executed: 16. The filesystem tree
  was hashed before and after each probe.
- **Maintainability — CONCERNS.** QA4-1 to QA4-3.

---

## Code Review

- CR-1 (medium/high) → T154-QA4-1
- CR-2 (medium/high) → T154-QA4-2
- CR-3 (low) → T154-QA4-3
- CR-4 (low) → T154-QA4-4
- CR-5 and CR-6 (cleanup) are advisory

**Mutation spot check:** proofs H1 to H4 at 5b are recorded in the implementation report. The by-hand
re-probe repeated the same paths independently.

**Platform variance:** `TMPDIR=/tmp node --test tests/test-clean-checkout.test.js` → 11/11.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Next Steps**: `/qa-fix` cycle 4.
