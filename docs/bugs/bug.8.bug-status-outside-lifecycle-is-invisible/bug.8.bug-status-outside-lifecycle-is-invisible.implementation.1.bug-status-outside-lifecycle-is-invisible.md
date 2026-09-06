---
type: implementation-report
status: in-progress
bug: 'bug.8.bug-status-outside-lifecycle-is-invisible'
mode: 'general'
started: '2026-09-06T00:00:00Z'
---

# Implementation Report — bug.8.bug-status-outside-lifecycle-is-invisible

**Started:** 2026-09-06
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.8.bug-status-outside-lifecycle-is-invisible` created at `9e54f93f` off `develop` | |
| 2 | review-bug | ✅ Done | READY TO FIX 9/10 — 0 Critical, 1 Important (applied), duplicate=none, reproduces=likely | `bug.8.….review.1.…md` |
| 3 | investigate-fix | ✅ Done | Fix + 13 regression tests; npm test 2482/2483 pass, 0 fail; bug → ready-for-qa | — (in-line, no subagents) |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-06 — Bug resolved: `docs/bugs/bug.8.bug-status-outside-lifecycle-is-invisible/bug.8.bug-status-outside-lifecycle-is-invisible.md` (mode=general, prefix=`bug.8.bug-status-outside-lifecycle-is-invisible`)
- 2026-09-06 — No active pipeline lock; `last-halt.json` belongs to task.84 (different work item) — fresh run.
- 2026-09-06 — Bug status `new`; severity Major / priority High → **lite mode off** (Major bugs always run full QA in Steps 5–6).
- 2026-09-06 — Q1 branch model: **regular bugfix** (user-confirmed recommended default; not a production regression).
- 2026-09-06 — Q2 base branch: **develop** (user-confirmed).
- 2026-09-06 — Q3 PR target: **develop** (user-confirmed).
- 2026-09-06 — No `github_issue`/`jira_key` in bug frontmatter → `TRACKER_ISSUE` empty; tracker signalling skipped.

- 2026-09-06 — Step 1: branch `bugfix/bug.8.bug-status-outside-lifecycle-is-invisible` cut from `develop` (9e54f93f). Pipeline lock written (current_step=2). No tracker issue → Signal Work Started skipped.

- 2026-09-06 — Step 2: /review-bug (validate-and-apply) → **READY TO FIX 9/10**. Duplicate scan: none (nearest neighbour bug.9, different defect). Stale scan: reproduces=likely — all four claims re-verified on HEAD 9e54f93f. One Important fix applied to the bug report: the "not mentioned in `skipped[]`" claim understated the code — the row IS recorded in `registryFrontier.passedOver[]`; the real defect is indistinguishability from a terminal status. Review report: `bug.8.bug-status-outside-lifecycle-is-invisible.review.1.bug-status-outside-lifecycle-is-invisible.md`.
- 2026-09-06 — Step 3 fix, 3 changes (floor deliberately NOT widened, per the bug's own `Do not`):
  1. `BUG_LIFECYCLE_STATUSES` / `TASK_LIFECYCLE_STATUSES` exported from `select-next.mjs` — the lifecycle had no home in code, only in prose, so nothing could validate against it.
  2. `registryFrontier()` tests lifecycle **before** floor: off-lifecycle rows get their own `reason`, `offLifecycle: true`, a `warnings[]` entry, and a named mention in the `roadmap-complete` `detail`. **Second gap found and closed**: `frontier.warnings` was returned only under `--lint` — the unattended loop, the caller that most needed it, could never see it.
  3. New `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` — the filing-time guard, moved upstream of the gate it previously sat behind.
- 2026-09-06 — Regression tests: 7 in `select-next.test.mjs` (§B8) + 6 corpus. Fails-without proved, then **mutation-proved 6 ways** (each reversion turned the expected test red, listed in the bug's Fix Implementation table).
- 2026-09-06 — Doc sweep: `skills/develop-next/references/roadmap-selection.md` §127 (canonical passed-over-reason list) and §173 (test coverage). `skill-catalog.md` regenerated — unchanged, no SKILL.md frontmatter touched.
- 2026-09-06 — Pre-pass run in-line rather than via Explore subagents (session directive: no AgentTool unless requested). Both axes verified directly with grep + a live `--lint` run; recorded so the audit trail is honest about how the scan was performed.

## Issues Log

- 2026-09-06 — **Environment, not a repo defect.** `node` is a shell function here that runs bare `nvm` first, so nvm help lands on stdout before every node CLI's output. It corrupted the first `select-next.mjs --lint` capture. Every node call in this run uses `command node`. Worth knowing for any future session on this machine.
- 2026-09-06 — **A `str.replace` without an assertion silently no-opped**, dropping one Status History row. Caught on read-back and fixed; every subsequent edit script asserts each pattern before replacing.

### Environment hazard (recorded for every later step)

The shell snapshot defines `node()` as a function that runs bare `nvm` before `command node "$@"`, so **nvm's help text is written to stdout ahead of every node CLI's real output**. Any JSON captured from a node CLI in this session is corrupted unless invoked as `command node`. All node invocations in this pipeline use `command node`.

## Completion

**Branch:** bugfix/bug.8.bug-status-outside-lifecycle-is-invisible
**PR:** —
**DoD Summary:** —
