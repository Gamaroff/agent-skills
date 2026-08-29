---
type: review-report
status: complete
bug: 'bug.2.unbounded-test-concurrency'
mode: 'general'
reviewer: 'review-bug (validate-and-apply)'
created: '2026-08-29'
updated: '2026-08-29'
description: 'Fix-readiness review of bug.2 (unbounded test concurrency) — READY TO FIX, 10/10, no duplicate, defect still present'
---

# Bug Review — bug.2.unbounded-test-concurrency

## Executive Summary

```
Bug: bug.2.unbounded-test-concurrency (general)
Fix-readiness: 10/10 — ✅ READY TO FIX
Critical: 0  Important: 0  Optional: 2
Duplicate: none   Reproduces: likely
Top blockers: none
```

Invoked in validate-and-apply mode as Step 2 of `/develop-bug` (autonomous run from `/develop-next`,
roadmap item B2). Mode: `general`. Branch `bugfix/bug.2.unbounded-test-concurrency` already created by
Step 1 — Step 0a branch setup short-circuited. The bug lifecycle `status` was not mutated; it remains
`new` for Step 3 to move to `in-progress`.

This is an unusually strong report. It arrives with measured evidence rather than a narrative, states
plainly what it did **not** manage to reproduce, and its suggested fix is already backed by a
back-to-back timing comparison. The review found nothing blocking and no missing detail.

## Score breakdown

| Dimension | Score | Note |
| --- | --- | --- |
| Completeness | 10/10 | All seven required sections present, mode-correct `## Scope & Impact` heading, full frontmatter matching the template. |
| Reproducibility | 9/10 | Concrete numbered steps, environment, explicit expected-vs-actual, frequency and reproducible fields, measured margin table. Docked one point: the primary failure was **not** reproduced in isolation — see the note below, which is a caveat for Step 3, not a blocker. |
| Classification | 10/10 | Major / High is correct and was left unchanged. |
| Linkage | 10/10 | `docs/bugs/bug-registry.md:31` row exists with a status consistent with frontmatter; `related` correctly records the cross-cutting (no single owner) form. |

Average 9.75 → **10/10**.

## Pre-pass results

**Duplicate scan — `duplicate: none`.** Examined every row of `docs/bugs/bug-registry.md` (only bugs 1
and 2 exist; next number is 3), `bug.1.ready-for-development-candidates` (closed, unrelated Jira
status-mapping defect), and ~30 story/task bugs under `docs/tasks/` (task.41, .42, .44, .45, .46, .51,
.52, .54, .63 families). Several matched on incidental vocabulary; none names this root cause.

The nearest miss is worth recording: `task.63.bug.1` concerns a corrupt heartbeat file in
`run-loop.mjs`, not the test harness. The *flake* that T62 and T63 merged over is described narratively
in the roadmap Change Log, and those rows explicitly say it still wants its own bug — they are the
justification for bug.2, not a prior filing of it.

**Already-fixed / stale scan — `reproduces: likely`.** The defect is fully present; nothing has been
fixed in code. All five of the report's claims were re-verified against `develop` at `c5d4573` with
file:line evidence — see the new "Verified against the tree at review time" subsection written into
the bug's Evidence section. Work to date is paperwork only: the bug file, the roadmap row, the
registry row, and commit `fb24143` (a docs-only measurement commit).

## Findings

### Critical

None.

### Important

None.

### Optional

1. **The asymmetry table slightly overstates the parity suite's remediation.** It reads as "that file
   was fixed, its neighbour was not", but only 1 of that file's 12 `spawnSync` call sites actually
   routes through `shellAnswer()`. Applied to the bug file as a correction, because it changes the
   relative cost of the two suggested fixes rather than merely adding colour.

2. **Hand-maintained test globs are a latent sibling defect.** All 21 globs currently match at least
   one file and nothing is orphaned today, but 11 of them are one-skill-one-line, so a new
   `skills/*/tests/` or `evals/*/{unit,protocol}/` directory is silently uncovered until someone edits
   `package.json:24`. Noted in the bug file as explicitly **out of scope for this fix**. Worth its own
   bug if it recurs — this repo has been bitten by it before.

## Fixes applied to the bug report

- ✅ Added `## Evidence` → "Verified against the tree at review time (review-bug, 2026-08-29)": a
  five-row confirmation table with file:line evidence for every claim.
- ✅ Recorded the correction to the asymmetry table (1-of-12 call sites, with the ten raw sites listed).
- ✅ Recorded the glob-maintenance hazard as adjacent and out of scope.
- ✅ Added `updated: '2026-08-29'` to frontmatter (OKF `timestamp`).
- ✅ Added a `## Status History` row recording this review.
- Severity and priority were assessed and **left unchanged** at Major / High.

Nothing was skipped for want of information. No codebase file was modified.

## Note for Step 3 (reproduce + fix)

`develop-bug` Step 3 requires reproducing the failure before fixing, and HALTs if the bug proves not
reproducible. The report is candid that a failure was **not** reproduced in isolation. Step 3 should
therefore reproduce against the *margin*, which is what the evidence actually establishes, using the
report's own sharper recipe — add filler test files to an existing glob to raise process pressure, and
observe the inflation — rather than waiting for the intermittent failure to appear on its own. A
regression test for this bug is a test of the **invocation** (that `npm test` bounds concurrency), not
of the flaky suite.

## Next Steps

Proceed to Step 3. No human input required.
