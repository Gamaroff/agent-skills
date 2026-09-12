---
type: implementation-report
status: completed
bug: 'bug.15.doctor-activation-check-cwd-relative'
mode: 'general'
started: '2026-09-12T13:35:29Z'
---

# Implementation Report — bug.15.doctor-activation-check-cwd-relative

**Started:** 2026-09-12T13:35:29Z
**Finished:** 2026-09-12T13:51:38Z
**Final Status:** Completed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Minor / Medium
**Lite mode:** on
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.15.doctor-activation-check-cwd-relative` off `develop` at `ce472992`; issue #393 created + board In Progress | — |
| 2 | review-bug | ✅ Done | READY TO FIX 10/10; 0/0/0; dup none; reproduces likely | inline (no subagents) |
| 3 | investigate-fix | ✅ Done | projectRoot() anchor + state field; 4 regression tests (mutation-proved); ci:fast green 3186/3187 | inline (no subagents) |
| 4 | create-pr | ✅ Done | PR #394: https://github.com/Gamaroff/agent-skills/pull/394 (commits 87facc8 fix, c47f7f0 docs) | — |
| 5–6 | verify-fix loop | ✅ Done | Cycle 1 PASS (lite: regression 4/4 + suite 52/52 + ci:fast green); qa-cycle-1 comment posted | — |
| 7 | finalise-close | ✅ Done | DoD ACCEPTED (bug.15.dod.1); CI rollup SUCCESS on c47f7f04; bug closed; registry row 15 → closed; issue #393 closed; board Done (already) | — |
| 8 | commit-changes | ✅ Done | Committed in `5ce99c15` (PR #394) | — |

## Decisions Log

- 2026-09-12T13:35:29Z — Invoked from /develop-next (autonomous run; item B15, source bug-registry). All Phase 0d prompts auto-answered with the recommended option.
- 2026-09-12T13:35:29Z — Bug resolved: docs/bugs/bug.15.doctor-activation-check-cwd-relative/bug.15.doctor-activation-check-cwd-relative.md (mode=general, prefix=bug.15.doctor-activation-check-cwd-relative) — resolved inline from the given path; no Explore subagent needed.
- 2026-09-12T13:35:29Z — Lite mode: on — severity=Minor, priority=Medium.
- 2026-09-12T13:35:29Z — Q1 branch model: bugfix (auto-answered — not a production regression).
- 2026-09-12T13:35:29Z — Q2 base branch: develop (auto-derived from Q1).
- 2026-09-12T13:35:29Z — Q3 PR target: develop (auto-derived from Q1).
- 2026-09-12T13:35:29Z — TRACKER=github, VCS=github (resolve-platform.sh).

- 2026-09-12T13:37:10Z — Step 1: branch `bugfix/bug.15.doctor-activation-check-cwd-relative` created off `develop` (ce472992), pushed with upstream. Implementation report stashed before branch creation, restored after.
- 2026-09-12T13:37:10Z — Step 1: ensure-bug-github-issue → issue #393 created (labels `bug`, `priority:medium`), added to board 1, Priority P2; `github_issue: 393` written to bug frontmatter; Status History row added.
- 2026-09-12T13:37:10Z — Step 1: work-started comment posted (reason=posted); gh-stage work-started Todo → In Progress (verified).
- 2026-09-12T13:38:06Z — Step 2: review-bug invoked in validate-and-apply mode. Pre-pass scans run inline (not as Explore subagents): duplicate none; reproduces likely (found_at observation-log.js:957,1119,1149). Verdict READY TO FIX 10/10, no fixes applied. Report: docs/bugs/bug.15.doctor-activation-check-cwd-relative/bug.15.doctor-activation-check-cwd-relative.review.1.doctor-activation-check-cwd-relative.md. Tracker comment posted (review-bug, reason=posted).
- 2026-09-12T13:43:10Z — Step 3: bug moved new → in-progress → ready-for-qa. Reproduced with the report's exact steps; root cause = two `args.auditRoot || process.cwd()` anchors (cmdFamilies, cmdDoctor). Localised inline from the report's Related Files (no Explore subagent — the report already named file:line and the repro confirmed it).
- 2026-09-12T13:43:10Z — Step 3 fix (≤5 bullets): (1) `nearestGitEntry()` factored out of `repoWorktrees()`, `projectRoot(args)` added — `--audit-root` verbatim, else nearest `.git` root, else cwd; (2) `cmdDoctor` + `cmdFamilies --audit` anchor there and report `root`; (3) activation check gains `state: configured|not-configured|no-agent-file`; (4) contract §"The project root is resolved the same way" + SKILL.md step-1 row; (5) bundled copies regenerated. Files: shared/resources/observation-log.js, shared/resources/tests/observation-log.test.mjs, shared/resources/observation-log-contract.md, skills/observe-work/SKILL.md, skills/observe-work/references/{observation-log.js,observation-log-contract.md}.
- 2026-09-12T13:43:10Z — Step 3 regression tests (4): fail 4/4 pre-fix (48/52), pass post-fix (52/52); mutation (revert anchor in projectRoot) → 3 red; restored → 52/52.
- 2026-09-12T13:43:10Z — Step 3 gate: `npm run ci:fast` run 1 failed on prettier (new test file); `prettier --write` applied; run 2 green — 3187 tests, 3186 pass, 0 fail (1 skipped), exit 0.
- 2026-09-12T13:47:37Z — Step 4: SCOPE_PATHS = [docs/bugs/bug.15.doctor-activation-check-cwd-relative, shared/resources, skills/observe-work]; no out-of-scope untracked files held. Two commits via commit-changes: 87facc8 fix(bug.15), c47f7f0 docs(bug.15). Leak check OK.
- 2026-09-12T13:47:37Z — Step 4: PR created: https://github.com/Gamaroff/agent-skills/pull/394 (base develop, Closes #393). Post-PR state check: PR #394 state = OPEN, head c47f7f0418e8 == local HEAD. errors = 0. in-review comment posted (reason=posted). GitHub board: in-review → stage-disabled (no column mapped; card stays In Progress).
- 2026-09-12T13:48:54Z — Step 5: github 393 — in-qa: stage-disabled.
- 2026-09-12T13:51:25Z — Step 7 Part A: /finalise run as the inline DoD checklist for a bug document (develop-bug Step 7 fallback, same shape as bug.14). DoD file: docs/bugs/bug.15.doctor-activation-check-cwd-relative/bug.15.dod.1.doctor-activation-check-cwd-relative.md — ACCEPTED; CI rollup SUCCESS on c47f7f04 (5/5 jobs COMPLETED SUCCESS). registry-tick: not-a-task. Canonical PR comment posted (marker). No sprint-review summary (bug).
- 2026-09-12T13:51:25Z — Step 7 Part B: Resolution Summary written; status ready-for-qa → closed (frontmatter + body); final Status History row; bug-registry row 15 → closed. B4: issue #393 doc links re-pointed to develop; done comment posted (reason=posted); issue closed (state CLOSED verified); gh-stage done → already (card was already in Done — closing the issue moved it).

## QA Iteration History

### Verify Cycle 1 — 2026-09-12
**Regression test**: pass (4/4; exact repro returns state=configured, gaps=[])
**Suite + lint**: pass (observation-log.test.mjs 52/52; prettier clean; ci:fast 3186/3187 exit 0 on this code)
**Code review**: skipped (lite mode)
**Fast gate**: n/a
**Verdict**: PASS
**Action**: Proceeding to finalise

## Issues Log

- 2026-09-12T13:37:10Z — Step 1: first `tracker-issue.js --kind create` failed — the template's `--label priority:${PRIORITY}` / `severity:${SEVERITY}` use Title Case and the repo has lowercase `priority:*` labels and no `severity:*` labels. Retried with `priority:medium` only (already logged as obs #65).

## Completion

**Completion Summary:** Fixed the cwd-relative project lookups in `observation-log.js`: `doctor`'s `activation-configured` check and `families --audit` now anchor at `projectRoot(args)` (`--audit-root` verbatim → nearest enclosing repo root → cwd) and report the `root` they used; the activation check gained a `state` field separating "file present, no mention" from "no file here". Four regression tests from a nested cwd (mutation-proved), contract + SKILL.md updated, bundled copies regenerated. One fix iteration, one verify cycle (PASS, lite mode); DoD accepted on a CI-green head; bug closed, registry row 15 closed, issue #393 closed. Notable decisions: all Phase 0d prompts auto-answered (develop-next); pre-pass and root-cause scans run inline rather than as Explore subagents (the report already named file:line); first issue-create attempt failed on label casing/missing severity labels (obs #65) and was retried with the existing lowercase label.

**Branch:** bugfix/bug.15.doctor-activation-check-cwd-relative
**PR:** https://github.com/Gamaroff/agent-skills/pull/394
**DoD Summary:** docs/bugs/bug.15.doctor-activation-check-cwd-relative/bug.15.dod.1.doctor-activation-check-cwd-relative.md
