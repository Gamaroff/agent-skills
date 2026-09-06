---
type: implementation-report
status: in-progress
bug: 'bug.11.finalise-relink-regresses-terminal-status'
mode: 'general'
started: '2026-09-06T15:34:47Z'
---

# Implementation Report — bug.11.finalise-relink-regresses-terminal-status

**Started:** 2026-09-06T15:34:47Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | `bugfix/bug.11.finalise-relink-regresses-terminal-status` from `develop` at `39b8e871`; no tracker issue → Signal Work Started skipped | — |
| 2 | review-bug | ✅ Done | validate-and-apply: **READY TO FIX 9/10**; 3 Critical + 5 Important auto-applied to the bug report; duplicate=none, reproduces=likely | `bug.11.review.1.finalise-relink-regresses-terminal-status.md` |
| 3 | investigate-fix | ✅ Done | `--no-transition` on all 3 syncs, gated inside `syncDocumentStatus`; finalise Step 7 passes it. 16 regression tests, 5 mutation proofs. `ci:fast` 2498 pass / 0 fail | — |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-06T15:34:47Z — Invoked by `/develop-next` (roadmap orchestrator). Selection source: `bug-registry` (B11); no authored phase held an actionable row.
- 2026-09-06T15:34:47Z — Bug resolved: docs/bugs/bug.11.finalise-relink-regresses-terminal-status/bug.11.finalise-relink-regresses-terminal-status.md (mode=general, prefix=bug.11.finalise-relink-regresses-terminal-status)
- 2026-09-06T15:34:47Z — Phase 0b: no active pipeline lock. `last-halt.json` present but belongs to task.84 (merged 2026-09-05) — stale, not a resume for this bug. Fresh run.
- 2026-09-06T15:34:47Z — Phase 0c: status=new, severity=Major, priority=High. Lite mode **off** (Major severity is excluded from lite mode by the develop-bug rule). No `github_issue`/`jira_key` in frontmatter → TRACKER_ISSUE empty; tracker signalling skipped throughout.
- 2026-09-06T15:34:47Z — Phase 0d Q1 branch model: **bugfix** — auto-answered (recommended default). This is a skill-library defect in `sync-jira-*`/`finalise`, not a production regression; no "production"/"hotfix" marker in the report.
- 2026-09-06T15:34:47Z — Phase 0d Q2 base branch: **develop** — auto-answered, derived from Q1.
- 2026-09-06T15:34:47Z — Phase 0d Q3 PR target: **develop** — auto-answered, derived from Q1.
- 2026-09-06T15:34:47Z — Platform: VCS=github, TRACKER=github, ACCESS_TRACKER=full, ACCESS_VCS=full.
- 2026-09-06T15:34:47Z — Scope note carried into Step 3: PR #326 shipped Recommendation item 1 (the Step 7 documentation fix). Item 2 — a `--no-transition` flag on `sync-jira-{story,task,epic}` passed by finalise's re-link — is the outstanding durable fix and is what this run must deliver.
- 2026-09-06T15:35:49Z — Step 1: branch name is the canonical `bugfix/{bug-prefix}`. PR #326 used the same name and was merged+deleted, so there is no collision; the name is kept because `review-pr` resolves a PR back to its work item by stripping `bugfix/` and looking for `*/${STEM}/${STEM}.md` — a decorated name would break that resolution.
- 2026-09-06T15:37:50Z — Step 2 pre-pass run **inline rather than via Explore subagents**. Both checks reduce to exact greps (`--no-transition` across `skills/`+`shared/`; sibling bugs + registry rows), so an inline run is faster and leaves reproducible evidence in the review report. Recorded so the substitution is visible.
- 2026-09-06T15:37:50Z — Step 2 confirmed **not STALE** despite PR #326 having merged: #326 shipped Recommendation item 1 (the finalise Step 7 doc fix) only. `grep -rn -- '--no-transition'` returns one hit — `skills/finalise/SKILL.md:1129`, prose describing the fix — and `syncDocumentStatus` is still unconditional at four call sites.
- 2026-09-06T15:37:50Z — Step 2 auto-applied 8 bug-report fixes (3 Critical: Developer Fix Cycle / Status History / Resolution Summary sections; 5 Important: Evidence section, Environment, Frequency+Reproducible, and two canonical heading renames). Severity/priority **unchanged** — Major/High confirmed correct.
- 2026-09-06T15:53:39Z — Step 3 fix summary:
  - Gate placed **inside** `syncDocumentStatus` (before any HTTP), not at the four call sites — a per-caller check is only as strong as the least-updated caller.
  - `--no-transition` added to `sync-jira-{task,story,epic}` and forwarded at all four call sites.
  - Outcome reason is `transition-suppressed`; `summariseStatusOutcome` exits 0 for it so the flag composes with `--fail-on-status-skip`.
  - `finalise` Step 7 block 3 passes the flag; the falsified "the sync no-ops" prose corrected and block 4 reframed as confirmation.
  - Regression suite `shared/resources/tests/jira-sync-no-transition.test.mjs` (16 tests), confirmed matched by the existing `npm test` glob.
- 2026-09-06T15:53:39Z — **Two defects found and fixed during the fix, both worth recording.** (1) `sync-jira-epic` has TWO `syncDocumentStatus` call sites; the first patch wired only one, and every behavioural test still passed — test E now pins every call site, and E2 pins the count. (2) The first version reused the reason name `no-transition`, which already means the OPPOSITE in this module (the board offers no matching transition — a real skip). Adding it to `summariseStatusOutcome`'s zero-exit list would have silently stopped every genuine skip from failing under `--fail-on-status-skip`. Renamed to `transition-suppressed`; test B2 pins the two apart.
- 2026-09-06T15:53:39Z — Out of scope, deliberately: `review-story`'s `--doc-branch` sync still drives status. There the transition is the point, and the bug names only finalise's re-link. Also out of scope per the bug's own text: reversing the Step 7 block order back to sync-first.
- 2026-09-06T15:53:39Z — `npm run bundle` re-bundled `jira-sync.js` and `develop-pipeline-step-7-finalise.md` into consumer skills' `references/`. It also emitted a previously-missing `skills/develop-next/references/document-status-lifecycle.md` — pre-existing bundle drift, unrelated to this fix, included because leaving the tree unbundled is what makes the next run silently revert a fix.

## Issues Log

## Completion

**Branch:** `bugfix/bug.11.finalise-relink-regresses-terminal-status`
**PR:** —
**DoD Summary:** —
