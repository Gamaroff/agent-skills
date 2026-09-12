---
id: task.113
title: "[Task 113] develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item"
type: task
description: "Six observations (#13, #30, #31, #34, #35, #46) record that develop-next Step 4 'Tick the roadmap' has no branch for a registry-sourced selection — now the default path, since no phase is open. task.103 closed most of it from finalise (registry-tick.js writes the Status cell), so the remedy the early observations propose is stale: what remains is the notes/PR and issue cells, the step's title and commit convention, and the empty-tick case. Two adjacent gaps ride along: the merge gate blocks on the literal PASS token when finalise has already accepted a CONCERNS gate with no findings (#52), and the work-started signal skipped at Step 1 for a fresh item is never re-fired after Step 2 creates the issue (#53)."
tags: [develop-next, develop-batch, pipeline, tracker]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 5
---

# Technical Task: develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Status:** Planned

---

## 1. Overview

Three bookkeeping gaps in the orchestrator, all of the same shape: a step written when the only
input was a roadmap row and the only good gate was `PASS`, left unchanged when selection widened to
the registries and `/finalise` learned to accept a CONCERNS gate with no open findings.

**Scope**: `skills/develop-next/SKILL.md` Steps 3 and 4, the `develop-batch` merge-and-tick step,
and `shared/resources/develop-pipeline-step-2-review.md`.

## 2. Motivation

### Current Problems

1. **Step 4 is roadmap-only, and the registry path is now the default.** Tasks 98, 100, 101, 106
   and 107 were all selected via the registry fallback; every run improvised the same registry tick
   and wrote a near-identical commit message explaining why there was no roadmap row (#30, #31,
   #34, #35). Since task.103, `/finalise` writes the Status cell — so a Step 4 registry writer must
   be **additive** (notes/PR, issue cell), never a second Status writer (#46). The 2026-09-12 sweep
   settled the roadmap-row question: registry items get no roadmap row. Step 4 still says nothing.
2. **The merge gate re-reads the gate token with less information than `/finalise` had.** Step 3
   requires `PASS`; QA rule 4 yields `CONCERNS` on any NFR concern with `top_issues: []`, and
   `/finalise`'s matrix accepts that. task.105 was blocked at 90/100, accepted, CI 5/5, on the
   literal token (#52). `WAIVED` is not mentioned at all.
3. **The work-started signal has a guard that becomes true one step after it is checked.** For a
   freshly authored item `TRACKER_ISSUE` is empty at Step 1, so 0c-reg is skipped; Step 2's linkage
   check creates the issue; nothing re-fires the signal. The card sits in the first column and the
   pipeline-start comment is never posted (#53, task.106 — fixed by hand).

### Benefits

1. The durable, committed record of a run stops depending on who ran it.
2. Honest CONCERNS gates stop being punished, so QA keeps recording them.
3. Tracker cards move when work starts, on the normal path.

## 3. Technical Background

- `skills/develop-next/SKILL.md` Step 1 already records `item.source` on every selection (≈99-104).
  Step 4 (≈"Tick the roadmap") edits `<roadmapPath>` only. Step 3 "Verify green" (≈133) reads
  the gate token.
- `shared/resources/registry-tick.js` (task.103) — the Status writer; returns `not-a-task` for
  non-task documents; every outcome exits 0.
- `docs/development/project-completion-roadmap.md` §Housekeeping (2026-09-12) — the rule that
  registry items need no roadmap row.
- `shared/resources/develop-pipeline-step-2-review.md` — the tracker-linkage check that creates the
  issue; `develop-pipeline-step-0-resolve-and-prepare.md` §0c-reg — the signal procedure (idempotent:
  marker → `already`).
- `skills/develop-batch/SKILL.md` — the serial merge-and-tick step, same duty.

## 4. Scope

### In Scope

✅ Step 4 renamed source-neutrally; `item.source` branch: roadmap (unchanged) / registry (notes + PR,
issue cell if created mid-run, `docs(registry): …` commit; **no** Status write, **no** roadmap row);
the empty-tick case stated
✅ Step 3 precondition: `accepted` ∧ gate ≠ `FAIL` ∧ no `open` entry in `top_issues[]`; `WAIVED` named;
head-SHA and quality-gate clauses kept
✅ Step 2 doc: conditional 0c-reg re-fire
✅ `develop-batch` mirror; eval/protocol tests updated (`evals/develop-next/protocol/skill-shape.test.mjs`
and the batch sibling assert step shapes)

### Out of Scope

❌ Any selector change · ❌ making `--batch` registry-aware (documented as deliberate)

## 5. Breaking Changes

None to consumers. A run's Step 3 will now merge an `accepted` + `CONCERNS`/`WAIVED` item it
previously halted on — the intended behaviour, stated in CHANGELOG.

## 6. Implementation Plan

1. Read the six observations together and #46 first; write Step 4's registry branch from what
   remains after task.103, not from the early proposals.
2. Step 3 wording; enumerate the gate/document combinations in a small table in the step.
3. Step 2 re-fire conditional; confirm idempotence by reading 0c-reg's marker handling.
4. develop-batch mirror; update the protocol tests that pin step shapes; mutation-prove one
   (remove the registry branch → the shape test reds).
5. Verify against the next real run (`/develop-next` on B13) and record the Step 4 output.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/develop-next/SKILL.md` | Steps 3, 4 |
| `skills/develop-batch/SKILL.md` | merge-and-tick mirror |
| `shared/resources/develop-pipeline-step-2-review.md` | 0c-reg re-fire (bundles into develop-story/task/bug) |
| `evals/develop-next/protocol/*.test.mjs`, `evals/develop-batch/protocol/*.test.mjs` | shape assertions |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Protocol shape tests for the new step text (with a floor); a fixture run of the registry branch
against a scratch registry file; mutation of each new clause reds its assertion by name.

## 9. Success Criteria

1. Step 4 contains an explicit `item.source` branch; the registry branch writes notes/PR and issue cells only and names the empty-tick case
2. Step 3 merges an `accepted` document with a `CONCERNS` or `WAIVED` gate that has no open findings, and still halts on `FAIL` or an open finding
3. Step 2 re-fires 0c-reg when the issue was created there; a second run reports `already`
4. `develop-batch` carries the same branch
5. Observations #13, #30, #31, #34, #35, #46, #52, #53 close with this task's PR named

## 10. Risk Assessment

**Medium.** Step 3 is the merge gate; loosening it wrongly merges bad work. Mitigation: the
loosening is only from "PASS token" to "finalise's verdict + no open finding", which is strictly
more information, and `FAIL` still halts.

## 11. Rollback Plan

`git revert`; the old Step 3/4 text returns. No state.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |

---

## Progress Tracking

### Phase 1: Step 4 branches on `item.source`
- [ ] Registry branch: notes/PR + issue cell (Status already ticked by finalise); commit convention; empty-tick case named
- [ ] `develop-batch` merge-and-tick step mirrors it
### Phase 2: merge gate
- [ ] Step 3 keys on `accepted` + not `FAIL` + no open `top_issues[]`; `WAIVED` named
### Phase 3: work-started re-fire
- [ ] Step 2 doc: if `TRACKER_ISSUE` was empty at Step 1 and is set after the linkage check, run 0c-reg once

---

## References

- **Plan**: [`task.113.plan.develop-next-registry-bookkeeping.md`](task.113.plan.develop-next-registry-bookkeeping.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #13, #30, #31, #34, #35, #46 (re-scope), #52, #53
- **Related Skill**: `.agents/skills/develop-next/`, `.agents/skills/develop-batch/`; `shared/resources/develop-pipeline-step-2-review.md`
- **Already landed**: task.103 — `/finalise` ticks the registry Status cell via `registry-tick.js`

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.113.develop-next-registry-bookkeeping/task.113.develop-next-registry-bookkeeping.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
