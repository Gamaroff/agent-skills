# QA Report: Task 207 - Doc numbering enforcement and sweep (cycle 5)

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.5.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.5.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 (the last in budget) at head `563b4c0b`. No HIGH for the second gate running. BUG-6 is
fixed. The sweep still has a residue population — ~20 layout paths that drop the `prd.{P}.{feature}`
directory — and two guard-precision gaps (bracket-form two-level ids; file-wide title exemptions).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Cycle 4 | Status now | Evidence |
| --- | --- | --- | --- |
| TASK-207-BUG-6 `<S>` source | MEDIUM | ✅ FIXED | both lists map `<S>` to `.story` + `.sub` |
| TASK-207-BUG-3 YAML/config population | MEDIUM | ⚠️ PARTIAL | YAML fixed; `{domain}/{feature}/epics` layout and `[epic].[story]` remain |
| CR4-4 story-template parent link | LOW | ✅ FIXED | line 600 (header line 3 still `../epics/`, CR-4) |
| CR4-5 qa-story example id | LOW | ✅ FIXED | `story.1.336.1` |

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 4 (head 763f1d8c956b; 12 files) — default. One Explore
reviewer, dispatched 17:56:19Z, `duration_ms` 115491. `SAFETY_REPROBE=false`.

Convergence check: HIGH `1, 0, 0` — no trip. Route classifier: Diminishing-returns needs the
residue to be entirely test machinery (it is not: prose paths and ids); Cosmetic-residue is
PASS-only. Budget: this is cycle 5 of 5 → 5b, then the Loop-limit route (2c is decided by the
engine).

---

## New Findings This Cycle

- **[medium]** `skills/qa-story/SKILL.md:3308` — `{domain}/{feature}/epics/` omits `prd.{P}.`; the same in ~20 lines across 12 files (measured: `git grep -nE '\{domain\}/\{feature\}/epics|\[domain\]/\[feature\]/epics|<domain>/<feature>/epics'`). (BUG-3)
- **[medium]** `skills/qa-story/SKILL.md:1579` — `[epic].[story]`. (CR5-2)
- **[medium]** `tests/doc-id-chokepoint.test.js:621` — whole-file title exemption. (CR5-3)
- **[low]** `skills/documentation-standards-validator/references/story-template.md:3` — `../epics/` links. (future)
- **[low]** `tests/ingester-prompt-placeholders.test.js:58` — explanatory mentions count as bound. (CR5-5)
- **[cleanup]** `skills/qa-fix/resources/qa-gate-template.yaml:5` — `{story_slug}` vs the writers' descriptive name; no task form. (future)

---

## Issues Found

### MEDIUM (3)
- **TASK-207-BUG-3** (reopened) — [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)
- CR5-2, CR5-3

### LOW (1)
- CR5-5

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned — no boundary changed; gate 1's run record stands.
- **Probes executed**: 0 this cycle
### Maintainability — CONCERNS

---

## Code Review

**Correctness bugs (5):** CR-1, CR-2 [medium/high] promoted; CR-3 [medium/medium] promoted after
verification; CR-4 [low] future; CR-5 [low].
**Cleanups (1):** CR-6, future.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` (cycle 5 of 5), then the Loop-limit route
