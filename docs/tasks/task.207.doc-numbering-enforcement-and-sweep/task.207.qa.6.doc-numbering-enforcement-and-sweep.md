# QA Report: Task 207 - Doc numbering enforcement and sweep (cycle 6, gate-the-last-fix)

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.6.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.6.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

A half-cycle gate on `1f8de5cd`, the cycle-5 fix no gate had read, run at the user's request after
the loop limit. The guards and contracts hold and CI is green. The layout sweep is still incomplete:
tree diagrams and concrete example paths keep a flat feature directory above `epics/`, a population
the line-based, placeholder-only `FLAT_LAYOUT` key cannot see.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Cycle 5 | Status now | Evidence |
| --- | --- | --- | --- |
| TASK-207-BUG-3 layout paths | MEDIUM | ⚠️ PARTIAL | placeholder paths fixed; trees and concrete examples remain (CR6-1, CR6-2, CR6-4) |
| CR5-2 bracket two-level id | MEDIUM | ✅ FIXED | `[P].[E].[S]` |
| CR5-3 file-wide exemption | MEDIUM | ✅ FIXED | anchored lines; stale-anchor test |
| CR5-5 binding head names | LOW | ✅ FIXED | must-fail fixture |

---

## Testing Scope

### Review Methodology

Half-cycle (`**Half-cycle**: gate-the-last-fix`), granted by the user after the engine declined it
(`medium-not-falling`). Scope: files changed since gate 5 (head 563b4c0b; 14 files). One Explore
reviewer, dispatched 18:17:59Z, `duration_ms` 106905; it ran both test files (17/17). No 5b follows
a half-cycle gate.

CR6-1 was rated high by the reviewer and graded medium here: it is the same class (a prose layout
residue) graded medium at gates 4 and 5, and nothing executes the tree diagram.

---

## New Findings This Cycle

- **[medium]** `prd-structure-guide.md:25,638`, `qa-story/SKILL.md:3340` — trees root `epics/` under `[feature]/`. (BUG-3)
- **[medium]** `/epics/epic.` example paths with no `prd.*` parent — ~23 lines in 14 files. (CR6-4)
- **[medium]** `prd-structure-guide.md:301-304` — numbering bullets in the old meanings. (CR6-3)
- **[medium]** `develop/SKILL.md:261` — `epic.178.<name>` holds `story.1.178.8`. (CR6-5)
- **[low]** `develop/SKILL.md:117`, `create-issue/SKILL.md:204`, `qa-story/SKILL.md:2521` — examples disagree with their own ids. (CR6-6)
- **[cleanup]** `tests/doc-id-chokepoint.test.js` — FLAT_LAYOUT lookbehind rejects hyphenated and digit P. (CR6-8)

---

## Issues Found

### MEDIUM (4)
- **TASK-207-BUG-3** (reopened) — [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)
- CR6-4, CR6-3, CR6-5

### LOW (1)
- CR6-6

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 1

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

## Regression Testing

PR checks on `aac45de6`: test, validate, link-check, shellcheck, branch policy — all pass. **PASS.**

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: escalation (half-cycle gate has open entries)
