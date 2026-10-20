# QA Report: Task 193 - Scripts reach only the skills that run them (cycle 3)

**Task**: [task.193.scripts-reach-only-skills-that-run-them.md](./task.193.scripts-reach-only-skills-that-run-them.md)
**Gate File**: [task.193.gate.3.scripts-reach-only-skills-that-run-them.yml](./task.193.gate.3.scripts-reach-only-skills-that-run-them.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2's fixes hold on real documents. The cycle-3 review raised the fenced-literal exemption to HIGH with two live cases. Cycle 2 had routed it to follow-up as outside the task's population. That was the wrong call: the task's defect class is "a `shared/resources/` literal copies a script into skills that do not run it", and the bundler reads fences. So identical output on base means the task is unfinished (qa-task Step 3b 5b).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED (CR-1)

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 — nested paths invisible | ✅ FIXED | `shared/resources/tests/qa-loop-route.test.mjs` written into the resume contract → reported (scratch worktree, `53f72587`) |
| CR-2 — prose read as a command | ✅ FIXED | `(source \`shared/resources/grant-qa-cycles.sh\`)` in the resume contract → reported; §1 fixtures cover the parenthetical, line-initial and closing-backtick shapes |
| CR-4 (advisory) — bundler sets unchecked | ✅ FIXED | a new `skills/zz-probe/references/develop-pipeline-step-5-6-qa-loop.md` fails §2 bundler sets |
| CR-5 (cleanup) — extension end | ✅ FIXED | §1 fixture: `r.json` not reported |
| CR-3 (pre-existing) — fenced literals | ❌ NOT FIXED | re-raised as gate 3 CR-1 (HIGH) |

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head `beb68968`; 6 files, task docs excluded from the patch) — default. One Explore reviewer, 129,334 ms (`duration_ms`). Measured the fenced population with the shared matcher: 3 fenced script literals are not opened by `isRun`'s forms or a shell command at the line start. Of those, `tracker-state-poller-subagent.md:128` (`if ! source …`) is a run, which leaves 2.

---

## New Findings This Cycle

- **[high]** `tests/shared-script-literals.test.js:290` — every fenced literal is exempt, but the bundler copies from fences. Live: `probe-boundary-rule.md:66` (`shared/resources/tests/qa-execute-snippets.test.mjs`, a quoted path that copies the test into qa-story and qa-task, neither of which runs it) and `develop-pipeline-step-0-resolve-and-prepare.md:251` ("- Source `shared/resources/resolve-paths.sh` …" in a fenced prompt). Both are identical on `origin/develop`, and both are in the task's class. **Promoted (CR-1).**
- **[medium/medium]** `tests/shared-script-literals.test.js:435` — the bundler-set test counts any holder of `references/<doc>`, including a skill that only cites it. No live case among the 23 entries (every holder also holds the script), so this is a latent false failure. Advisory (CR-2).
- **[low/low]** `tests/shared-script-literals.test.js:100` — backtick parity is per line, and Markdown spans can wrap. Advisory (CR-3).
- **[low cleanup]** `CHANGELOG.md:184` — "sees what the bundler sees" overstates the guard while fences are exempt (CR-4).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1–2, 4 | PASS | unchanged |
| Phase 3: Guard and pin | FAIL | CR-1 |

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Every script literal is bare or ALLOWED | blind to fenced non-run literals; 2 live (CR-1) | FAIL |
| Others | unchanged; `ci:fast` 5904/0 on `53f72587` | PASS |

## Breaking Changes Validation

None.

## Issues Found

### HIGH Severity Issues (1)

- **CR-1** — fenced literals exempt; 2 live copies. Recommendation: classify fenced lines; fix both sites.

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- CR-3 (advisory), CR-4 (cleanup). CR-2 is advisory at medium/medium.

**Total Issues**: HIGH: 1, MEDIUM: 0 (+1 advisory), LOW: 2

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — `scan` and `isRun` classify a CI lint finding; no external input.

### Maintainability — CONCERNS
CR-1, CR-4.

## Code Review

**Correctness bugs (3):** CR-1 [high/high] — promoted; CR-2 [medium/medium] — advisory; CR-3 [low/low] — advisory.
**Cleanups (1):** CR-4.

All anchors checked with `finding-anchors.js --rev HEAD`.

mutation-proven: nested literal in the resume contract → §2 live tree → covered
mutation-proven: `(source …)` in the resume contract → §2 live tree → covered
mutation-proven: a new holder of `develop-pipeline-step-5-6-qa-loop.md` → §2 bundler sets → covered

## Recommendations

### Immediate Actions (Blocking)
1. CR-1.

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3, CR-4.

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 80/100
**Deployment Recommendation**: BLOCKED — CR-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.193.qa.3.scripts-reach-only-skills-that-run-them.md`
**Gate File**: co-located at `task.193.gate.3.scripts-reach-only-skills-that-run-them.yml`
**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.
