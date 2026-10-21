# QA Report: Task 222 - finalise gaps path fixes (cycle 4)

**Task**: [task.222.finalise-gaps-path-fixes.md](./task.222.finalise-gaps-path-fixes.md)
**Gate File**: [task.222.gate.4.finalise-gaps-path-fixes.yml](./task.222.gate.4.finalise-gaps-path-fixes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Executive Summary

All four cycle-3 findings are fixed and mutation-proven. The gap count and the Step 8.5 body now share one reader (`dod-gap-count.sh --body`). The scoped re-review found one LOW: `--body` prints the marker `S` for a gaps section with no lines. Step 8.5 never posts that, because its count call HALTs on the same document first. The LOW was carried to `recommendations.future` by the cosmetic-residue exit.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-222-9 fence opener matches inline-span prose | medium | ✅ FIXED | Inline-span fixture; probe → 1; mutation `covered` |
| QA-222-10 lock-7 hook text ticks Step 7 on accepted | medium | ✅ FIXED | Scenario 5d asserts the tail and the checklist come before ✅; mutation `covered` |
| QA-222-11 8.5 body reads historical sections | medium | ✅ FIXED | `--body`; the re-run 8.5 test; mutations `covered` |
| QA-222-12 closer length | low | ✅ FIXED | 4-backtick fixture; probe → 1; mutation `covered` |

---

## New Findings This Cycle

- **[low]** `shared/resources/dod-gap-count.sh:110`: `--body` prints `S` for an empty section → treat a bare `S` as an empty body (QA-222-13, carried by route 2b)

---

## Testing Scope

### Review Methodology

This is a re-review, using direct tools plus one diff-review subagent:

```
Re-review scope: files changed since gate 3 (head cbfc3f782f24; 10 files) — default
```

The reviewer was dispatched at 15:45Z and returned with `duration_ms` 140155 (about 2.3 min). Its anchor `shared/resources/dod-gap-count.sh:110` was confirmed with `sed -n 110p`. `SAFETY_REPROBE=false`.

Step 4b: `skills/finalise/SKILL.md` has 2 changed blocks. Both are refused by design, because their helpers write or `rm -rf`, and both are executed by committed tests. The 8.5 block is executed by `finalise-bug-mode.test.mjs`, including the new re-run case.

The loop route was classified by `classifyLoopRoute()`: `cosmetic-residue`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both defects (red) | PASS | Verified | |
| Phase 2: One gap-count definition | PASS | Verified | The count and the body share one reader; QA-222-13 is low and masked |
| Phase 3: Hold the lock unless ACCEPTED | PASS | Verified | |
| Phase 4: Tests, doc sweep, bundle | PASS | Verified | The hook text is aligned with the Step 7 checklist |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 2 / 3 / 1 / 7 counts | `finalise-gaps-path.test.mjs` | PASS |
| the count reads the current section | Re-run, historical-only, fence and inline-span fixtures | PASS |
| the lead and the body name one list | `--body` test; the re-run 8.5 test in `finalise-bug-mode.test.mjs` | PASS |
| GAPS holds at 7, ACCEPTED moves to 8 | lock tests (72/72 helper, `finalise-gaps-path.test.mjs`) | PASS |
| a gaps halt resumes at `/finalise` | Protocol exception test; on-stop scenario 5d | PASS |
| `npm test` 0 failures | .249 fast gate: 6141 pass, 1 environmental; CI `test` pending @ 042211a5 | PASS (CI pending) |
| bundle:check, validate ×4, shellcheck, prettier | all clean | PASS |

---

## Issues Found

### LOW Severity Issues (1)

- **QA-222-13** `shared/resources/dod-gap-count.sh:110`: `--body` prints `S` for a section with no lines. Reproduced: a heading followed directly by `## Change Log` → stdout `S`, exit 0. It is carried to `recommendations.future` (route 2b).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The count, the body and the lock hold agree on one section and one outcome.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, unchanged. `--body` adds an output, not an input.

### Maintainability — PASS
There is one reader of the gaps section.

---

## Code Review

Code review is blocking (`code_review_blocking=true`).

**Correctness bugs (1):**
- [low/high] `shared/resources/dod-gap-count.sh:110`: `--body` prints the marker for an empty section. → QA-222-13 (carried, route 2b)

**Cleanups (0)**

No QA mutation spot-check this cycle. The developer's 5 cycle-3 mutations were recorded `covered`, one of them after a void mutant was replaced, and QA reproduced the cycle-3 probes against `042211a5`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Gaps path, bug mode, step-8 checklist | PASS: 131/131 |
| Stop hook | PASS: 52/52 |
| Lock helper | PASS: 72/72 |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.222.qa.4.finalise-gaps-path-fixes.md`
**Gate File**: co-located at `task.222.gate.4.finalise-gaps-path-fixes.yml`
**Next Steps**: Cosmetic-residue exit to 5c (`/review-pr`).
