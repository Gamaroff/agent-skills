# QA Report: Task 222 - finalise gaps path fixes (cycle 3)

**Task**: [task.222.finalise-gaps-path-fixes.md](./task.222.finalise-gaps-path-fixes.md)
**Gate File**: [task.222.gate.3.finalise-gaps-path-fixes.yml](./task.222.gate.3.finalise-gaps-path-fixes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's three fixes hold for the cases they named. The scoped re-review found four defects that cycle 2's changes introduced or exposed:
- **Fence opener (QA-222-9):** the new line-1 fence tracking opens on a prose line that starts with an inline backtick span.
- **Stop hook (QA-222-10):** the lock-7 text offers ✅ before the Step 7 tail and checklist have run.
- **Body extractor (QA-222-11):** Step 8.5's body still reads historical sections, which the count no longer does.
- **Fence closer (QA-222-12, low):** a ```bash line closes a ```` fence.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-222-9, -10 and -11 fixed)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-222-6 counter reads historical sections | medium | ✅ FIXED | Exact heading; the re-run and historical-only fixtures pass; task.173 HALTs |
| QA-222-7 Stop hook lock-7 reason advances to 8 | medium | ⚠️ PARTIAL | Advance is now conditional on accepted, but the ✅ comes too early (QA-222-10) |
| QA-222-8 fence parity | low | ⚠️ PARTIAL | Marker matching added; the opener and closer are too loose (QA-222-9, QA-222-12) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/dod-gap-count.sh:48`: the fence opener matches an inline-span prose line → require a valid opener (QA-222-9)
- **[medium]** `shared/resources/develop-pipeline-on-stop.sh:271`: the lock-7 text ticks Step 7 on accepted → name the tail and checklist (QA-222-10)
- **[medium]** `skills/finalise/SKILL.md:2654`: the 8.5 body extractor reads historical sections → one reader for count and body (QA-222-11)
- **[low]** `shared/resources/dod-gap-count.sh:51`: the closer is compared on 3 characters only → match run length (QA-222-12)

---

## Testing Scope

### Review Methodology

This is a re-review, using direct tools plus one diff-review subagent:

```
Re-review scope: files changed since gate 2 (head 0b404b98d731; 8 files) — default
```

The reviewer was dispatched at 15:23Z and returned with `duration_ms` 181231 (about 3 min). `finding-anchors.js` reported `malformed-anchors`. CR-2 is `out-of-range`: it was anchored at `shared/resources/dod-gap-count.sh:271`. Its quoted line sits at `shared/resources/develop-pipeline-on-stop.sh:271`, so QA verified the finding there independently. `SAFETY_REPROBE=false`.

Step 4b: not applicable, because no runnable-prose document changed since gate 2.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both defects (red) | PASS | Verified | |
| Phase 2: One gap-count definition | CONCERNS | Verified | Fence opener and closer (QA-222-9/12); the body reader disagrees (QA-222-11) |
| Phase 3: Hold the lock unless ACCEPTED | PASS | Verified | |
| Phase 4: Tests, doc sweep, bundle | CONCERNS | Verified | Hook text ticks Step 7 early (QA-222-10) |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 2 / 3 / 1 / 7 counts | `finalise-gaps-path.test.mjs` | PASS |
| the count reads the current section | Re-run fixtures pass; inline-span prose HALTs (QA-222-9) | CONCERNS |
| the lead and the body name one list | Probe: lead 1, body 4 on a re-run document (QA-222-11) | CONCERNS |
| GAPS holds at 7, ACCEPTED moves to 8 | lock tests | PASS |
| a gaps halt resumes at `/finalise` | Scenario 5d passes; the ✅ timing is wrong (QA-222-10) | CONCERNS |
| `npm test` 0 failures | CI `test` pass @ cbfc3f78 | PASS |

---

## Issues Found

### MEDIUM Severity Issues (3)

**QA-222-9: Fence opener matches inline-span prose.** Reproduced: a line reading "```` ``` ```` is a fence opener, like `~~~`." before a current section with 1 gap → HALT. Real documents task.42 and task.85 carry the shape.

**QA-222-10: Lock-7 hook text ticks Step 7 on accepted.** The Step 7 Completion Checklist keeps the row ⏳ until it passes.

**QA-222-11: Body and count read different sections.** `GAP_REPORT_BODY` at `skills/finalise/SKILL.md:2654` uses `/^## Definition of Done - Gaps Identified/` with no fence handling.

### LOW Severity Issues (1)

- **QA-222-12** `dod-gap-count.sh:51`: closer length. Reproduced with ```` / ```bash / ```` before a valid section → HALT.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
QA-222-9 HALTs on a valid document. QA-222-10 can tick Step 7 early.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, unchanged.

### Maintainability — CONCERNS
QA-222-11: two readers of the section disagree.

---

## Code Review

Code review is blocking (`code_review_blocking=true`). The three `bug`/`high` findings at medium severity were promoted; CR-2 is promoted with its location verified by QA. CR-4 is `bug`/`high` at low severity and was promoted as low.

**Correctness bugs (4):**
- [medium/high] `shared/resources/dod-gap-count.sh:48`: the fence opener matches inline-span prose. → QA-222-9
- [medium/high] `shared/resources/dod-gap-count.sh:271` ⚠️ unverified anchor (out-of-range): the lock-7 text ticks Step 7 on accepted. QA located it at `shared/resources/develop-pipeline-on-stop.sh:271`. → QA-222-10
- [medium/high] `shared/resources/dod-gap-count.sh:56` (reader at `skills/finalise/SKILL.md:2654`): the body extractor reads historical sections. → QA-222-11
- [low/high] `shared/resources/dod-gap-count.sh:51`: the closer is compared on 3 characters. → QA-222-12

**Cleanups (0)**

No QA mutation spot-check this cycle. Cycle 2's fixes were mutation-proven by the developer: 4 `covered`, plus a fixture reorder. QA re-ran the cycle-2 probes against `cbfc3f78`, and all now give the right result.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Gaps path, bug mode, step-8 checklist | PASS: 129/129 |
| Stop hook | PASS: 52/52 |
| Lock helper | PASS: 72/72 |
| CI @ cbfc3f78 | PASS (test, shellcheck, validate, link-check) |

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/dod-gap-count.sh <probe>   # inline-span prose: HALT (want 1); 4-backtick: HALT (want 1)
gh pr checks 718                                 # all pass @ cbfc3f78
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-222-9, QA-222-10 and QA-222-11 fixed

---

**QA Report**: co-located at `task.222.qa.3.finalise-gaps-path-fixes.md`
**Gate File**: co-located at `task.222.gate.3.finalise-gaps-path-fixes.yml`
**Next Steps**: `/qa-fix`, then re-review (cycle 4).
