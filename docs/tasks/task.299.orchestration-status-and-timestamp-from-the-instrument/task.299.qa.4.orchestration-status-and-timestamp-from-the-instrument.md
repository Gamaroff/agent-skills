# QA Report: Task 299 - Orchestration reads status and time from the instrument

**Task**: [Link to task document](./task.299.orchestration-status-and-timestamp-from-the-instrument.md)
**Gate File**: [task.299.gate.4.orchestration-status-and-timestamp-from-the-instrument.yml](./task.299.gate.4.orchestration-status-and-timestamp-from-the-instrument.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's finding is fixed. The reviewer re-probed the apostrophe fixtures in both directions, real single-quoted arguments, mixed quoting, and the real population scan (192 files, zero flagged). One low-severity edge remains.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools plus one read-only Explore reviewer. Diff review: code review. Re-review scope: files changed since gate 3 (head cf073f668243; 4 files, one of them code) — default. The review patch was `tests/orchestration-instrument-reads.test.js` against the PR base. Remote `ci:fast` was green on the fix commit (8461 pass, exit 0).

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T299-QA-6 apostrophe in prose opens a quote | ✅ FIXED (word-boundary rule; fixtures both ways; mutation proof red) |

## New Findings This Cycle

- **[low]** `tests/orchestration-instrument-reads.test.js:63` — a quote glued to the preceding word is not masked (T299-QA-7, reproduced; advisory in effect, does not move the gate)

---

## Implementation Verification

All three phases PASS. Success criteria unchanged from cycle 1: all PASS. `criteria-drift.js`: clean.

---

## Issues Found

### LOW Severity Issues (1)

T299-QA-7. Reproduced: `cmd; echo foo'bar; baz' $?` and `cmd; echo "a"'s; b' $?` are missed; the control with a space before the quote is flagged. Rare shell syntax; not present in the real population.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

Performance PASS. Reliability PASS. Security PASS (reasoned, `boundary: false`). Maintainability PASS.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `tests/orchestration-instrument-reads.test.js:63` — glued single quote not masked (T299-QA-7, reproduced by QA)

**Cleanups (0).**

Reviewer calibration: apostrophe fixtures both directions, four real single-quoted shapes, five mixed-quote shapes all behave as expected; population scan clean.

mutation-proven: removed the word-boundary rule → guard fixture test red → dev-only (developer's cycle 3 proof; not re-run by QA).

---

## Findings Table: Phase 1 Measurement and Guard Cost

Recorded at `/finalise` (2026-11-13) so the measurement sits in a committed QA report. The commands and counts come from the implementation report's Decisions Log (Step 3).

| Shape | Command (over skills, shared, scripts, docs) | Hits | Class |
| --- | --- | --- | --- |
| Wrapped status | `git grep -nE 'echo[ ]+"?[A-Za-z_]*(exit\|rc\|status\|code)[A-Za-z_]*=\$\?'` | 7 | All exclusions: 2 lines of one counter-example in `docs/bugs/bug.4`, 5 foreground test fixtures (`shared/resources/tests/changelog-cites.test.mjs:83`, four in `setup-consumer-skill-profiles.test.mjs`) where the command directly before the `echo` is the one being read |
| Typed time placeholder | `git grep -nE 'HH:MM\|\{timestamp\}\|ISO-8601'` over shared sources and `SKILL.md` | 12 | All fixed: report template ×5, autonomous-defaults, traceability-mapper prompt, triage prompt, summary schema ×2, hooks.md, pause.md, nestjs-debug ×4 (2 sentences). 0 left |
| Date-only placeholder | `{today}`, `{YYYY-MM-DD}`, `[Date]`, `{{date}}` | 70 across 27 files | Named exclusion (unseen shape): the date is in the session context; the observation was about time of day |

Guard cost, measured on head `a2ebf108`: `command node --test tests/orchestration-instrument-reads.test.js`, five runs, `uptime` read before each (1-minute load average in brackets): 978 ms [1.90], 1093 ms [1.90], 1181 ms [1.90], 970 ms [1.90], 1206 ms [1.91]. Median 1093 ms against the 3000 ms bound. Each run includes Node start-up. Outliers: none. This replaces the cycle-1 figure (357 ms on `5cf248b4`), which predates the matcher changes of cycles 2 to 4.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c `/review-pr`; T299-QA-7 and CR-2 stay in the gate's future recommendations.
