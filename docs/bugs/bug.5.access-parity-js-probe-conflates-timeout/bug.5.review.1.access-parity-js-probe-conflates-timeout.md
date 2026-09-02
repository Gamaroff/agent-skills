---
type: review-report
status: complete
bug: 'bug.5.access-parity-js-probe-conflates-timeout'
mode: 'general'
reviewed: '2026-09-01T16:25:41Z'
recommendation: 'READY TO FIX'
score: 9
---

# Bug Review — bug.5.access-parity-js-probe-conflates-timeout

**Mode:** validate-and-apply (invoked by `/develop-bug` Step 2, autonomous run)
**Reviewed:** 2026-09-01T16:25:41Z

## Executive Summary

```
Bug: bug.5.access-parity-js-probe-conflates-timeout (general)
Fix-readiness: 9/10 — ✅ READY TO FIX
Critical: 1 (auto-fixed)  Important: 0  Optional: 0
Duplicate: none   Reproduces: likely
Top blockers: none
```

| Dimension | Score | Note |
|-----------|-------|------|
| Completeness | 8 → 10 | Two template stub sections absent; auto-added |
| Reproducibility | 9 | Load-dependent, but a deterministic forcing method is specified |
| Classification | 10 | Major/High matches the stated impact |
| Linkage | 10 | Registry row #5 present and consistent |

Average (pre-fix) **9.25 → 9**; post-fix the completeness gap is closed.

## Pre-pass Results

**Duplicate scan — `none`.** Sibling bugs 1–4 are all `closed`. The nearest neighbour is
**bug.2** (`npm test` runs `node --test` unbounded, so spawn-heavy suites time out for
environmental reasons) which shares the *contention* theme, but is a different defect: bug.2 is
about the harness producing the load, bug.5 is about a probe **misreporting** what happens under
it. Bug.2's fix bounded concurrency; it did not — and could not — teach `jsAnswer()` to tell a
timeout from an answer. Not a duplicate.

**Already-fixed / stale scan — `reproduces: likely`.** Verified directly against
`shared/resources/tests/access-config-parity.test.mjs`:

- `shellAnswer()` (:146) **has** the fix — it discriminates `!r.error && !r.signal && r.status !== null`
  before reading a value, retries `SPAWN_RETRIES` times, and `throw`s an infrastructure-failure
  message rather than returning `REFUSAL_AS`. Its docstring (:131) documents precisely this defect.
- `jsAnswer()` (:184) **does not**. It is still:
  ```js
  try { return dm.resolveAccessTracker(env, { cwd: dir }); }
  catch { return "THREW"; }
  ```
  It catches only a *throw*. The production reader fail-closes to `manual` with a warning and does
  **not** throw, so a timed-out probe is returned as though it were a reading.

The defect is present in the current tree exactly as the report describes.

## Findings

### Critical (1 — auto-applied)

1. **Missing template sections: `## Developer Fix Cycle` and `## Resolution Summary`.**
   The bug report jumped from `## Suggested Fix` straight to `## Status History`, and ended
   there. Both are core template sections and both are written by the develop-bug pipeline
   (Step 3 fills the fix cycle, Step 7 the resolution summary) — absent, those steps would have
   had nowhere to write.
   ✅ **Fixed**: both stubs inserted in template order.

### Important (0)

Frontmatter is complete and every value is in range (`type: bug`, `status: new`,
`severity: Major`, `priority: High`, `created`, `updated`, `related`, `description`).
Identity is consistent across filename ↔ directory stem ↔ body **Bug ID**. The registry row for
\#5 exists with status `new`, matching frontmatter.

### Optional (0)

## Dimension Notes

**Reproducibility.** The headline repro is contention-dependent (`2 of 3` full runs, `0 of 2`
in isolation), which on its own would be a weak gate. What carries it is the report's own
**Mutation proof** clause — *"force the reader's subprocess to time out (a 1 ms timeout, or a stub
resolver that sleeps)"* — a deterministic forcing method, and one the file already uses for the
shell side at :972 (`shellAnswer(dir, "awk", { timeoutMs: 1, retries: 0 })`). A developer can
reproduce this on demand without waiting for load.

**Severity / priority.** `Major`/`High` is right and needs no correction. The suite is on the
mandatory pre-merge gate (task 75), and a gate that fails two-in-three under load trains people to
re-run until green — the report makes that argument itself.

**Scope discipline.** The report is explicit that this is **not** a production defect and that the
reader's fail-closed-to-`manual` behaviour must not change. That constraint is the most important
thing in the document and is stated unambiguously in two places.

## Next Steps

Proceed to `/develop-bug` Step 3 (reproduce + fix). The Suggested Fix section names the correct
shape: give `jsAnswer()` the ability to tell *refused* from *never ran*, retry on the existing
`SPAWN_RETRIES` budget, then throw — mirroring `shellAnswer()`. Do not raise the timeout and do
not touch `resolveAccessTracker`'s return semantics.
