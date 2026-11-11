---
type: implementation-report
status: in-progress
bug: 'bug.21'
mode: 'general'
started: '2026-11-11T11:10:00Z'
---

# Implementation Report — bug.21

**Started:** 2026-11-11T11:10:00Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 0

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref | Completed (UTC) |
|------|-------|--------|-------|----------------------|-----------------|
| 1 | create-branch | ✅ Done | `bugfix/bug.21.precompact-claim-mkdir-not-exclusive` off develop, local only; lock written at step 2 | | 2026-11-11T11:12Z |
| 2 | review-bug | ✅ Done | READY TO FIX 9/10 (`bug.21.review.1.*`); duplicate scans run in-line, no subagent. 2b: branch pushed, issue #880 opened, board In Progress, work-started comment posted | | 2026-11-11T11:25Z |
| 3 | investigate-fix | ✅ Done | Race reproduced on the LAN kernel (mkdir doubled 264/300); `take_claim` now uses `ln`; scenario 12a red 12/12 on old hook, suite 0 red in 20 runs after; lint:shell clean | | 2026-11-11T12:20Z |
| 4 | create-pr | ⏳ Pending | | | |
| 5–6 | verify-fix loop | ⏳ Pending | | | |
| 7 | finalise-close | ⏳ Pending | | | |
| 8 | commit-changes | ⏳ Pending | | | |

## Decisions Log

- 2026-11-11T11:10Z — Bug resolved: docs/bugs/bug.21.precompact-claim-mkdir-not-exclusive/bug.21.precompact-claim-mkdir-not-exclusive.md (mode=general, prefix=bug.21)
- 2026-11-11T11:10Z — Phase 0b: an active develop-task lock for task.304 (step 5, QA phase 5c, PR #876) blocked the run. The user chose to snapshot it and run this bug first. The lock was copied to `.claude/state/develop-pipeline.last-halt.json` (halt_step 5) and removed; a second copy is kept outside the repo. Resume task.304 with `/develop-task` afterwards (`advance-pipeline-lock.sh --restore`).
- 2026-11-11T11:10Z — Branch model, base and PR target: bugfix / develop / develop, all `recommended` (flag `--defaults`; Q1 had no production-regression signal).
- 2026-11-11T11:10Z — Lite mode off: severity Major is never lite.

## Issues Log

## Completion

**Branch:** —
**PR:** —
**DoD Summary:** —
