---
type: implementation-report
status: in-progress
bug: 'bug.22'
mode: 'general'
started: '2026-11-14T07:14:00Z'
---

# Implementation Report — bug.22

**Started:** 2026-11-14T07:14:00Z (branch creation, from the reflog; the earlier 00:00Z and step times in this report were composed, not measured, and are corrected here)
**Finished:** 2026-11-14T07:50Z
**Final Status:** Completed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Minor / Medium
**Lite mode:** on
**Fix Iterations:** 1 (verify cycle 1 PASS; no qa-fix needed)

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref | Completed (UTC) |
|------|-------|--------|-------|----------------------|-----------------|
| 1 | create-branch | ✅ Done | Branch created at `49eaa522` (bugfix/bug.22.excluded-prds-misses-domain-grouped-tree, via git directly) | | 2026-11-14T07:14Z |
| 2 | review-bug | ✅ Done | READY TO FIX 9/10; issue #903 opened (2b) | | |
| 3 | investigate-fix | ✅ Done | Regression test red→green, mutation-proven; `isExcluded`/`isPrdFolder` in uat-status.mjs | | 2026-11-14T07:32Z |
| 4 | create-pr | ✅ Done | PR #904 → develop; commit and push by git directly | | 2026-11-14T07:32Z |
| 5–6 | verify-fix loop | ✅ Done | Cycle 1 PASS (lite: signals 1+2) | | 2026-11-14T07:33Z |
| 7 | finalise-close | ✅ Done | DoD ACCEPTED (`bug.22.dod.1`); CI reading 1 SUCCESS @ `49488869ff5a`, reading 2 SUCCESS (tree-equivalent to `6e7c64e88844`) @ `f7fa755450d6`; issue #903 closed; Resolution Summary written, bug `closed` | | 2026-11-14T07:50Z |
| 8 | commit-changes | ✅ Done | Final report commit and push | | 2026-11-14T07:50Z |

## Decisions Log

- 2026-11-14 — Bug resolved: docs/bugs/bug.22.excluded-prds-misses-domain-grouped-tree/bug.22.excluded-prds-misses-domain-grouped-tree.md (mode=general, prefix=bug.22)
- 2026-11-14 — Up-front answers (develop-next --defaults): branchModel=bugfix (recommended), base=develop (recommended), target=develop (recommended), mode=standard (detector)
- 2026-11-14 — Lite mode: on — severity=Minor, priority=Medium

- 2026-11-14 — Step 1/4 used git directly (branch, commit, push) instead of `/create-branch` and `/commit-changes`; the mechanics were deterministic and scoped.
- 2026-11-14 — Step 2 review-bug ran in-line, no Explore subagents (the two pre-pass checks were a grep and a registry read).
- 2026-11-14 — in-qa / ready-for-merge: stage-disabled. qa-cycle-1 comment posted.

### Verify Cycle 1 — 2026-11-14
**Regression test**: pass
**Suite + lint**: pass
**Code review**: skipped (lite mode)
**Fast gate**: pass — `npm run test:remote`, rc=0
**Verdict**: PASS
**Action**: Proceeding to finalise

## Issues Log

## Completion

**Branch:** `bugfix/bug.22.excluded-prds-misses-domain-grouped-tree` → `develop`
**PR:** https://github.com/Gamaroff/agent-skills/pull/904
**DoD Summary:** `bug.22.dod.1.excluded-prds-domain-tree.md` — ✅ ACCEPTED

**Completion Summary:** `scanStories` in `qa-next` now excludes a PRD named by its own folder in a domain-grouped tree. `isExcluded` keeps the first-segment match and adds any segment doc-id reads as a PRD folder. One verify cycle, PASS; no qa-fix. A regression test covers the PRD-folder entry (sibling kept), a domain entry, a flat tree and no entry, and is mutation-proved. Notable decisions: branch, commit and push done with git directly rather than `/create-branch` and `/commit-changes`; review-bug and the four DoD checks ran inline, so no independent subagent review ran; a `(bug 22)` CHANGELOG entry was added although `changelog-cites.sh` does not require one for bugs. The first draft of this report carried composed timestamps; they were corrected to measured values (reflog and commit times).
