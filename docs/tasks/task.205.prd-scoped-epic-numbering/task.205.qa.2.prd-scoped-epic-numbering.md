# QA Report: Task 205 - PRD-scoped epic numbering (cycle 2, refute pass)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.2.prd-scoped-epic-numbering.yml](./task.205.gate.2.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 2)
**Review Date**: 2026-10-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's three gating findings are fixed and verified. The refute pass found the shape behind them:
the skill blocks this task adds declare their inputs in comments but bind them in other blocks, so
several of them fail or degrade when run as shipped. One HIGH (the task milestone block reads an
unbound `$EPIC_REF`) and four MEDIUM gate. The suite is green.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [TASK-205-BUG-1](./task.205.bug.1.milestone-rename-hijacks-shared-milestone.md) — rename hijacks a shared milestone | ✅ FIXED | guard test runs the block over sprint / foreign / own milestones; mutation-proven. Closed. (A low-confidence refinement is CR-9 below.) |
| CR-4 / [TASK-205-BUG-2](./task.205.bug.2.task-milestone-lookup-ignores-prd-root.md) — task lookup ignores PRD root | ✅ FIXED | the block sources `resolve-paths.sh`; a `specs/prd` fixture resolves. Closed. The same defect in review-epic is new finding CR-5. |
| CR-6 — story-title strip regressed | ⚠️ PARTIAL | dash and sub-story forms strip again, but the widening over-strips `Epic 10-Year Plan` (CR-8). |

---

## Review Methodology

Cycle 2: one Explore reviewer over the **whole** branch diff (5280 lines, 56 files; generated
`references/` copies and the catalog excluded) with the REFUTE PASS directive, cycle 1's fixes named.
Reviewer duration 158 s (completion notice `duration_ms` 158488). `SAFETY_REPROBE=false` (clause 1:
gate 1's security was PASS). Tests: the tree reviewed (`a1d73c9e`) is the tree the cycle-1 fast gate
ran green on — 5680 tests, 5666 pass, 0 fail. Step 4b unchanged from cycle 1 (pre-existing harness
findings only).

---

## New Findings This Cycle

- **[high]** `skills/ensure-task-github-issue/SKILL.md:67` — reads an unbound `$EPIC_REF` → read `epic:` from the task file in-block ([TASK-205-BUG-3](./task.205.bug.3.task-milestone-block-reads-unbound-epic-ref.md)).
- **[medium]** `skills/ensure-task-github-issue/SKILL.md:78` — second title parser → `frontmatterField` ([TASK-205-BUG-4](./task.205.bug.4.task-milestone-title-parsed-by-a-second-parser.md)).
- **[medium]** `skills/sync-github-epic/SKILL.md:193` — rename/edit block inputs guarded, never bound ([TASK-205-BUG-5](./task.205.bug.5.rename-block-inputs-never-bound.md)).
- **[medium]** `shared/resources/tracker-issue.js:1027` — failed lookup under `--rename-from` creates a duplicate ([TASK-205-BUG-6](./task.205.bug.6.rename-from-creates-on-lookup-failure.md)).
- **[medium]** `skills/review-epic/SKILL.md:84` — resolver ignores a configured PRD root ([TASK-205-BUG-7](./task.205.bug.7.review-epic-resolver-ignores-prd-root.md)).
- **[low]** `skills/create-epic/SKILL.md:415` — id-check inputs claimed re-bound, never assigned.
- **[low]** `shared/resources/doc-id.js:398` — a bare hyphen separates (`Epic 10-Year Plan` → `Year Plan`, reproduced).
- Advisory: `create-epics-from-shards/SKILL.md:381` unbound `$PRD_DIR` (medium confidence); `sync-github-epic/SKILL.md:206` title-match branch too wide for dotted ids (low confidence).

---

## Implementation Verification

All 7 phases remain implemented; phases 1, 3, 4 and 5 carry findings this cycle.

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
A failed lookup under `--rename-from` strands a milestone; skill blocks stop or degrade when run as shipped.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 10
- Re-probed the `review-epic` Input Resolution block (fence form, same 10 cases): verdict `engages`.
  Record: [task.205.qa.2.security.run.json](./task.205.qa.2.security.run.json).

### Maintainability — CONCERNS
The unbound-input class recurs across five blocks; the fix is one rule applied to all of them.

---

## Code Review

Promoted (`bug` + `confidence: high`): CR-1, CR-2, CR-3, CR-4, CR-5, CR-6, CR-8. Advisory: CR-7, CR-9.
All nine anchors checked (`finding-anchors.js --rev HEAD`): `ok`. Every finding is in lines this
branch adds (provenance: new).

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` cycle 2 — one structural move (each block binds its own inputs from the document it operates on), then cycle 3.
