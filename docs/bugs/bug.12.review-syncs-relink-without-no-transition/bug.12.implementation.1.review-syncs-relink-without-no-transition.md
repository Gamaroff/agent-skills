---
type: implementation-report
status: in-progress
bug: 'bug.12.review-syncs-relink-without-no-transition'
mode: 'general'
started: '2026-09-06T19:20:00Z'
---

# Implementation Report — bug.12.review-syncs-relink-without-no-transition

**Started:** 2026-09-06T19:20:00Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / Medium
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.12.review-syncs-relink-without-no-transition` created at `3469b793`, pushed with upstream tracking | |
| 2 | review-bug | ✅ Done | READY TO FIX, 9/10. Critical 0 / Important 1 / Optional 2. Duplicate none, reproduces likely. 4 corrections applied to the bug report | `bug.12.review.1.review-syncs-relink-without-no-transition.md` |
| 3 | investigate-fix | ✅ Done | Fix at 3 sites + regression tests G/G2/G3; mutation-proved 5 ways; ci:fast 2504 pass | pre-pass B reused as localisation evidence |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-06T19:20:00Z — Selected by `/develop-next` from the bug-registry fallback frontier (item B12); no roadmap phase held an actionable row.
- 2026-09-06T19:20:00Z — Bug resolved: `docs/bugs/bug.12.review-syncs-relink-without-no-transition/bug.12.review-syncs-relink-without-no-transition.md` (mode=general, prefix=bug.12.review-syncs-relink-without-no-transition)
- 2026-09-06T19:20:00Z — Lite mode: **off** — severity=Major (Major/Critical/Blocker always run full QA regardless of priority).
- 2026-09-06T19:20:00Z — Phase 0d Q1 branch model: **bugfix** (auto-answered, recommended default) — the bug is a pipeline-behaviour defect, not a production regression.
- 2026-09-06T19:20:00Z — Phase 0d Q2 base branch: **develop** (auto-answered, derived from Q1).
- 2026-09-06T19:20:00Z — Phase 0d Q3 PR target: **develop** (auto-answered, derived from Q1).
- 2026-09-06T19:20:00Z — TRACKER=github, VCS=github (git remote). Bug has no `github_issue`/`jira_key` — tracker stage signals skipped throughout.
- 2026-09-06T17:31:06Z — Step 1: branch `bugfix/bug.12.review-syncs-relink-without-no-transition` cut from `develop` at `3469b793`; pipeline lock written (`current_step: 2`). Signal Work Started skipped — bug has no tracker issue.
- 2026-09-06T17:35Z — Step 2 pre-pass A (duplicate): `none` — bug.11 explicitly deferred CR-1 to bug.12 to hold its PR scope; registry rows carry distinct areas.
- 2026-09-06T17:35Z — Step 2 pre-pass B (stale): `reproduces: likely` — all three sites confirmed flagless on current develop at `review-story:2060`, `review-task:1482`, `review-epic:767`.
- 2026-09-06T17:35Z — Scope confirmed **Jira-only**: `syncDocumentStatus` has no `sync-github-*` caller, so the three sites are the complete enumeration rather than a sample.
- 2026-09-06T17:35Z — Resolved the scope question raised by the corrected Recommendation: `review-task` Step 8.6 runs BEFORE Step 9's local promotion, so the status it pushes today is the pre-promotion (stale) value. Adding `--no-transition` removes a wrong write, not a needed one.
- 2026-09-06T17:35Z — Recommendation item 3 (parity guard over shipped prose) treated as **in scope** — it is what prevents the next silent addition, which is the failure mode that produced this bug.
- 2026-09-06T17:50Z — Step 3 fix (5 bullets): (1) `--no-transition` added at review-story 9.6, review-task 8.6, review-epic 11.5; (2) each site documents why the flag is there; (3) review-story Step 10 documents why it deliberately omits it; (4) regression tests G/G2/G3 assert the population invariant; (5) no behaviour change to `jira-sync.js` — bug.11's engine was already correct.
- 2026-09-06T17:50Z — Regression test name: `G: every writing sync-jira-* invocation is flagged or allowlisted` (+ G2 stale-allowlist, G3 site-pinning) in `shared/resources/tests/jira-sync-no-transition.test.mjs` — an existing file already inside the `npm test` glob, so the suite cannot be orphaned.
- 2026-09-06T17:50Z — No fresh Explore dispatched for root-cause localisation: Step 2's pre-pass B already returned file:line for all three sites plus the engine gate at `jira-sync.js:4194`. Re-running it would have re-derived a settled answer.
- 2026-09-06T19:20:00Z — `last-halt.json` present but belongs to task.84 (different work item, no active lock) → fresh run, snapshot left untouched.

## Issues Log

- 2026-09-06 — **Prettier failed the first `ci:fast`** on the new test file. Caught by the fast gate before the PR, which is the reason `npm run ci` (not `npm test`) is the merge gate. Fixed with `prettier --write`.
- 2026-09-06 — **`npm run bundle` crashed on my first draft of the Step 10 note.** Writing the literal path `shared/resources/tests/…` in shipped SKILL.md prose makes the bundler try to copy that file into `skills/review-story/references/tests/`, and it does not create nested parent dirs. The convention is that *any* `shared/resources/…` mention in shipped prose means "bundle this" — so a test file must not be named by path there. Note rephrased; bundle now exits 0 with no drift. The bundler's inability to create nested reference dirs is pre-existing and left alone as out of scope.
- 2026-09-06 — **Bug report contained a factual error, corrected in Step 2.** Recommendation item 2 asked the fixer to protect `review-task` Step 9 as an "intentional status push". That step performs no tracker sync at all. `review-story` Step 10 is the only deliberate push among these skills. Corrected in the bug report and recorded in the review report.


## Completion

**Branch:** `bugfix/bug.12.review-syncs-relink-without-no-transition`
**PR:** —
**DoD Summary:** —
