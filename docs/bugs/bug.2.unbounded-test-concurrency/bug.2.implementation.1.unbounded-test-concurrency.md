---
type: implementation-report
status: in-progress
bug: 'bug.2.unbounded-test-concurrency'
mode: 'general'
started: '2026-08-29T13:47:10Z'
---

# Implementation Report — bug.2.unbounded-test-concurrency

**Started:** 2026-08-29T13:47:10Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.2.unbounded-test-concurrency` created at `c5d4573` off `develop` | |
| 2 | review-bug | ✅ Done | READY TO FIX, 10/10. 0 Critical, 0 Important, 2 Optional. duplicate=none, reproduces=likely | `bug.2.review.1.unbounded-test-concurrency.md` |
| 3 | investigate-fix | ✅ Done | Bound all 5 runners + extracted shared spawn budget; 11 bare literals migrated. 7 regression cases, all mutation-proven. Suite 1883 pass / 0 fail | measurements inline in bug Evidence + Fix Implementation |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-08-29T13:47:10Z — Bug resolved: docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md (mode=general, prefix=bug.2.unbounded-test-concurrency)
- 2026-08-29T13:47:10Z — Invoked from /develop-next (roadmap item B2, PHASE 4 — maintenance backlog). Autonomous run.
- 2026-08-29T13:47:10Z — Q1 branch model: **bugfix** (auto-answered, recommended). Not a production regression — the defect is in the repo's own test gate, not in shipped behaviour.
- 2026-08-29T13:47:10Z — Q2 base branch: **develop** (auto-answered, derived from Q1).
- 2026-08-29T13:47:10Z — Q3 PR target: **develop** (auto-answered, derived from Q1).
- 2026-08-29T13:47:10Z — Lite mode: **off** — severity=Major (lite requires Minor/Trivial + Low/Medium).
- 2026-08-29T13:47:10Z — Tracker issue: none (no `github_issue`/`jira_key` in frontmatter). Work-started/blocked signals skipped silently.
- 2026-08-29T13:47:10Z — Platform resolved: VCS=github, TRACKER=github, ACCESS_TRACKER=full, ACCESS_VCS=full.

- 2026-08-29 — Branch name `bugfix/bug.2.unbounded-test-concurrency` (bugfix/{bug-prefix}; the pattern review-bug's branch-setup reference already recognises). Implementation report stashed before branch creation, restored after.
- 2026-08-29 — Signal Work Started skipped: no tracker issue linked to this bug.

- 2026-08-29 — review-bug invoked in validate-and-apply mode. Verdict **READY TO FIX (10/10)**; review report `docs/bugs/bug.2.unbounded-test-concurrency/bug.2.review.1.unbounded-test-concurrency.md`. Bug lifecycle status left at `new` (review-bug never transitions it).
- 2026-08-29 — Pre-pass A (duplicate scan): `duplicate: none` — ~30 sibling story/task bugs plus the registry examined; nearest miss `task.63.bug.1` is a heartbeat-reader defect, not the test gate.
- 2026-08-29 — Pre-pass B (already-fixed scan): `reproduces: likely` — all 5 filed claims re-verified against `c5d4573` with file:line evidence. Nothing fixed in code to date.
- 2026-08-29 — Applied to the bug report: verified-evidence table, one correction (the parity remedy covers only 1 of 12 spawnSync sites in its own file), `updated:` frontmatter, Status History row. Severity/priority assessed and left unchanged.
- 2026-08-29 — Noted out of scope: `package.json` test globs are hand-maintained (11 of 21 one-skill-one-line). No suite is orphaned today; not fixed here.

- 2026-08-29 — **Reproduced the margin, not a failure.** `jira-interception.test.mjs` alone: 3.20s idle → 48.51s under 24 spawn workers (15.2x); worst single test 461ms → 6741ms against a bare 20s timeout.
- 2026-08-29 — **Measurement redirected the fix, and this is the main decision of the run.** Full suite on a quiet box: unbounded 37s / c4 37s / c8 39s / unbounded-again 36s, with worst-test 2814 / 2638 / 2577 / 2602 ms. Bounding is free (confirms the report) but also buys nothing on a quiet box — the spread between the two *unbounded* runs is as wide as bounded-vs-unbounded. The suite does not self-oversubscribe enough to threaten a 20s timeout.
- 2026-08-29 — Under 16 competing spawn loops: unbounded 204s / worst test 16183ms; c4 226s / worst test 17110ms. Bounding does not help against load the suite does not own. A 16.2s worst case vs a bare `timeout: 20000` is a 1.2x margin — that is the coin flip, and it explains why failures only appeared alongside agent pipelines, never in isolation or CI.
- 2026-08-29 — Decisive detail: the file that absorbed the 16.2s spike was `access-config-parity.test.mjs`, the one file already carrying a 60s budget. `jira-interception.test.mjs` peaked at only 4.3s in the same run. So the report's option 2 (timeout headroom) is the effective remedy and option 1 alone would have closed the bug without changing the failure probability.
- 2026-08-29 — Shipped **both**: (1) `--test-concurrency="${TEST_CONCURRENCY:-4}"` on all 5 `node --test` invocations — free, and removes self-contention as a variable; (2) new `shared/resources/tests/spawn-budget.mjs` (60s default, 2 retries, `{PREFIX}_` → `TEST_` → default precedence, plus `neverRan()`), with all 11 bare timeout literals migrated onto it (6 in jira-interception, 5 in access-config-parity's raw sites). `PARITY_SPAWN_*` behaviour preserved exactly.
- 2026-08-29 — Not done, deliberately: retry wrapper not retrofitted onto all 20 spawn call sites. `neverRan()` is exported and the parity suite keeps using that logic, but rewriting 20 differently-shaped call sites carries regression risk with no measurement demanding it. Recorded as a follow-up trigger: only if a *timeout* failure recurs rather than a slow run.
- 2026-08-29 — Regression test `tests/test-harness-concurrency.test.js` (7 cases). Mutation-proven three ways: dropping the bound from one `eval:*` script, restoring one bare literal, and tightening the budget default each reddened exactly one guard, and only that guard.

## Issues Log

- 2026-08-29 — A first full-suite run measured 291s and briefly looked like the bound was costing 2x. It was machine load (15-min load average 11.8, from the measurement runs themselves), not the flag; a quiet back-to-back benchmark showed 36-39s across every configuration. Recorded because the wrong conclusion was available and cheap to draw.


## Completion

**Branch:** bugfix/bug.2.unbounded-test-concurrency
**PR:** —
**DoD Summary:** —
