# QA Report: Task 146 - qa-fix: a fix to an identity rule must prove both directions (cycle 2)

**Task**: [task.146.identity-rule-fix-probe.md](./task.146.identity-rule-fix-probe.md)
**Gate File**: [task.146.gate.2.identity-rule-fix-probe.yml](./task.146.gate.2.identity-rule-fix-probe.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-1: shared cycle-2 description omits Identity rules | medium | FIXED | `code-review-prompt.md` cycle-2 section names the pair; the new test holds it. QA mutation: identity phrase into the template's Discipline list → "names both refute probes" red |
| QA-2: count passes with a fifth bullet after the paragraph | medium | FIXED | QA mutation: a `•` after the paragraph in both blocks → both "sits outside" tests red |
| QA-3: "this shape" referent | low | FIXED | "lifecycle defect" at 4 sites; blocks still byte-identical (parity test green) |

## New Findings This Cycle

- **[medium]** `docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md:310` — `## QA Testing Results` sits inside the change-log marker block, between the `## Change Log` heading and its table → move it above `<!-- change-log-start -->` (**QA-4**, [bug 3](./task.146.bug.3.qa-results-inside-change-log.md))
- **[low]** `tests/identity-rule-probe.test.js:100` — the four-item count matches the `•` glyph only; a `-` fifth item evades it → count any list-item line (**QA-5**)

---

## Testing Scope

### Review Methodology

Direct tools, with one Explore subagent for the Step 3b diff review. Cycle 2 = **refute pass over
the whole branch diff** (`REFUTE_PASS=true`, one prior gate). The directive appended was the one this
task extended, so it included the new Identity rules paragraph. `SAFETY_REPROBE=false` (the prior
gate's security axis read `OK reasoned`).
Re-review scope: unscoped (cycle 2 refute pass, whole branch diff: 1514 lines, 20 files)
Step 4b: fired for `shared/resources/code-review-prompt.md` (newly touched), which reports
`no-executable-blocks` (information), the same on base. The three SKILL.md files are unchanged in
their fences since cycle 1; the finding there is pre-existing.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: qa-fix Step 3.5 | PASS | Unchanged except "lifecycle defect" (QA-3) |
| Phase 2: refute directive | PASS | Byte-identical; four bullets; paragraph outside the list |
| Phase 3: test | CONCERNS | QA-5 (glyph-bound count) |
| Phase 4: docs and validation | CONCERNS | QA-4 (task document structure) |

## Success Criteria Verification

All criteria held in cycle 1 hold here, except that the test criterion "fails when the entry
moves into the four-transition list" is now strengthened for `•` and still open for other list glyphs
(QA-5, low). ci:fast on `b6bf41d5`: 4011 tests, 0 fail.

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue QA-4: QA Testing Results inside the change-log marker block**
- **Category**: Quality (document structure)
- **Bug Report**: [task.146.bug.3.qa-results-inside-change-log.md](./task.146.bug.3.qa-results-inside-change-log.md)
- **Observation**: lines 310–350. The marker, then `## Change Log`, then `## QA Testing Results` (a full section), then the log table.
- **Impact**: the Change Log heading is empty and its table sits under QA Results. A whole-section
  replace (qa-task Step 12) running to the next `## ` would delete the table and the end marker.
- **Recommendation**: move the section above the start marker.

### LOW Severity Issues (1)

**QA-5**: a glyph-bound count; count any list-item line.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

- **Performance**: PASS
- **Reliability**: PASS
- **Security**: PASS. Evidence: reasoned; probes executed: 0. No boundary.
- **Maintainability**: PASS (QA-4 tracked)

---

## Code Review

Refute reviewer: Explore subagent, dispatched 09:28, returned in about 165s. It reviewed 20 files and
1514 lines, ran the test (7/7), and ran `bundle --check` (0 problems).

**Correctness bugs (2):**
- [medium/medium] `…/task.146.identity-rule-fix-probe.md:310` — CR-1 → **QA-4** (verified by reading)
- [low/medium] `tests/identity-rule-probe.test.js:100` — CR-2 → **QA-5**

Neither is high-confidence, so neither was promoted automatically. QA entered both.
**Boundary rule**: `boundary: false`.
**Provenance**: both were introduced on this branch.

**Mutation spot check (3c), guards on cycle-1 fixes:**
- mutation-proven: a `•` item after the Identity rules paragraph, both blocks → "sits outside the four-transition list" ×2 → covered
- mutation-proven: identity-pair phrase inserted into the template's Discipline list → "the shared cycle-2 description names both refute probes" → covered

---

## Regression Testing

`command node --test tests/identity-rule-probe.test.js 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js' shared/resources/tests/doc-links.test.mjs`
gave 52/52.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (QA-4)

**Next Steps**: `/qa-fix` cycle 2 (QA-4, QA-5), then QA cycle 3.
