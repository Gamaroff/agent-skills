# QA Report: Task 193 - Scripts reach only the skills that run them (cycle 4)

**Task**: [task.193.scripts-reach-only-skills-that-run-them.md](./task.193.scripts-reach-only-skills-that-run-them.md)
**Gate File**: [task.193.gate.4.scripts-reach-only-skills-that-run-them.yml](./task.193.gate.4.scripts-reach-only-skills-that-run-them.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: PASS

---

## Executive Summary

Gate 3's blocking finding is fixed. The guard now classifies fenced literals the way the bundler reads them. The two live fenced sites use the bare filename, and four more copies that nothing ran are gone (21 in total). The reviewer confirmed that no file in develop-bug, review-pr, qa-story or qa-task runs a removed copy. Two low findings remain, recorded as follow-ups.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 — fenced literals exempt | ✅ FIXED | restoring `probe-boundary-rule.md:66` or step-0:251 turns §2 live tree red; restoring the exemption turns §1 fenced red |
| CR-2 (advisory) — cite-only holder | ✅ FIXED | a holder of the doc without the script passes; the old filter fails it (probe) |
| CR-4 (cleanup) — CHANGELOG overstates | ✅ FIXED | reworded to list fences, `require(`/`import(`, `$(` and code spans |
| CR-3 (advisory) — per-line parity | ⏭️ deferred | future |

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 3 (head `53f72587`; one commit, `e82c3425`; task docs excluded from the patch) — default. One Explore reviewer, 174,363 ms (`duration_ms`). It ran `bundle --check` and the guard, and listed all 8 live fenced literals; all are real commands.

---

## New Findings This Cycle

- **[low/medium]** `tests/shared-script-literals.test.js:105` — `SHELL_BEFORE` accepts `time. `, `do. ` (a keyword with no space before the `.` builtin) and `(source ` inside a fence as commands. Confirmed with `isRunInFence`. There is no live case. Not promoted (confidence below high); routed to future.
- **[low cleanup]** `tests/shared-script-literals.test.js:23` — the §1 header still says a fenced line must not be reported.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1–4 | PASS | |

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Every script literal is bare or ALLOWED, fenced or not | §2 live tree; `bundle:check` 0 problems | PASS |
| Unrun copies removed | 21 removed; reviewer grep of the four skills finds no runner | PASS |
| Guard and pin | 8 tests, `ci:fast` 5905/0 on `e82c3425` | PASS |

## Breaking Changes Validation

None.

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- CR-1 (low/medium, future), CR-2 (cleanup, future).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — `scan` and `isRunInFence` classify a CI lint finding; no external input.

### Maintainability — PASS

## Code Review

**Correctness bugs (1):** CR-1 [low/medium] — not promoted.
**Cleanups (1):** CR-2.

All anchors checked with `finding-anchors.js --rev HEAD`.

mutation-proven: fence exemption restored → §1 fenced → covered
mutation-proven: shell position dropped → §1 + §2 live tree → covered
mutation-proven: `probe-boundary-rule.md:66` literal restored → §2 live tree → covered
mutation-proven: step-0:251 literal restored → §2 live tree → covered

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1, CR-2 (this cycle); CR-3 (gate 3).

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 92/100
**Deployment Recommendation**: READY

---

**QA Report**: co-located at `task.193.qa.4.scripts-reach-only-skills-that-run-them.md`
**Gate File**: co-located at `task.193.gate.4.scripts-reach-only-skills-that-run-them.yml`
**Next Steps**: `/review-pr` (5c).
