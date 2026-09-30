# QA Report: Task 155 - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.9.qa-results-section-engine.yml](./task.155.gate.9.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9 (the final operator-granted cycle) re-reviews commit `709e450b`, the gate-8 fix. It carries every Bug Reports block, stops a block at QA's own field lines, matches near-miss headings, merges a rendered list with the old one, and treats a trailing HTML comment as a separator. Both directions were measured again:

- **(a) Outside the replaced span, nothing is lost.** The QA engine alone lost 0 lines in a 4-write run over 1,990 tracked documents, and the result is idempotent. Single-fault injection lost 0 lines. In the fence sweep, the only lost lines are task.117's and task.45's template comment. They are lost only when a stray fence and a fenced block both sit between the section and the log (5 of 12,493 positions), and the gate-8 engine deleted the same comment on every replace.
- **(b) Inside the old span, all 11 tracked Bug Reports lists are kept verbatim, with one heading each.** task.117's comment now survives, and no QA text rides along with any tracked list. REL-020, REL-021 and REL-022 are closed, and REL-023 is partly closed.

The fix also brings new defects. The comment peel is not limited to a template lead-in, so a trailing comment the renderer writes stacks one copy per cycle (REL-024). A `#### Bug Reports` block carries QA's own later `####` text (REL-025). The render-with-list merge drops old lines that have no link and re-adds a multi-link line (REL-026). Three near-miss headings still drop the list silently (REL-027). All four are low: none has a tracked instance on the path that triggers it, and neither Step 12 template renders the shape. REL-026 and REL-027 still delete content, so Reliability stays CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (the four lows are fixed, or recorded as known limits in Deferred Work)

---

## Re-Review Context

| Previous item | Source | Status |
| --- | --- | --- |
| REL-020 (medium): a second `### Bug Reports` list was dropped | gate 8 | **FIXED**. Two lists fold into one and all links survive cycles 2–4 (probe). M1 is mutation-proven |
| REL-021 (low): stale QA fields rode along with a carried list | gate 8 | **FIXED** for the template fields (M2 is mutation-proven, and 0 of 11 tracked lists carry QA text). A residue remains for a non-template `**Gate**:` line or paragraph after the list, which is still carried (probe; 0 tracked instances) |
| REL-022 (low): task.117's template comment was deleted | gate 8 | **FIXED**. The corpus shows 0 comments lost for task.117 and task.45, and M4 is mutation-proven. The peel is too broad: see REL-024 |
| REL-023 (low): near-miss headings and a rendered takeover dropped the list | gate 8 | **PARTIAL**. `### Bug reports`, `#### Bug Reports`, `### Bug Reports (1)` and `### Bug Reports:` now carry (M3 is mutation-proven), and the rendered list merges (L2 is mutation-proven). `**Bug Reports**`, `### Bug Report` and `### Bugs` still drop the list (REL-027). The merge drops old lines that have no link (REL-026) |
| REL-018, REL-019 | gate 7 (route 2b) | Deferred, and unchanged by this commit |

## New Findings This Cycle

Every finding below was reproduced by executing the engine (the `probes.js` harness is described under Test Artifacts). **Effect** says whether the finding deletes text or only duplicates it. **Corpus** is the number of tracked instances.

- **[low] REL-024** `shared/resources/qa-results.js:248` (code review CR-1 + CR-4). The `trimSeparator` comment peel treats any trailing comment as a separator, not only a template lead-in before the log.
  - A render ending in `<!-- qa-results-end -->` gains one copy per cycle: 4 copies after 4 writes, and the write is no longer idempotent.
  - An old section's own trailing comment is left behind, stale, after the new section.
  - A last line ending in `-->` walks back to an earlier comment line, so the cycle-1 content between them (`10/100`) stays after the new section.
  - **Effect:** duplicates, never deletes. **Corpus:** 0 of 156 tracked sections hold a comment line after the peel, and 0 end in `-->`. Neither Step 12 template renders a comment.
  - This is a regression from the gate-8 engine, which replaced a trailing comment correctly.
  - → Peel only a comment that directly precedes the change-log block or its heading, and require the lines from `<!--` to `-->` to form one comment. Add a replace-twice test with a trailing comment.
- **[low] REL-025** `shared/resources/qa-results.js:149` (code review CR-2). A `#### Bug Reports` block ends only at a heading of level 3 or above, so QA's own later `####` subsections (such as `#### Recommendations`) are carried every cycle.
  - **Effect:** duplicates stale text, never deletes. **Corpus:** 0 tracked `#### Bug Reports` headings.
  - The REL-021 residue has the same effect: a non-template field or paragraph after a list at the end of the section is carried. **Corpus:** 0 of 11 lists.
  - → End a block at the next heading at or above its own level, and at the end of the list.
- **[low] REL-026** `shared/resources/qa-results.js:197` (code review CR-3 + CR-5). When the render brings its own `### Bug Reports`, the old block is merged line by line.
  - An old line with no link is dropped: `#### Open Bugs`, `- None`, a table header or a bold group label.
  - An old line naming several links is re-added whole when any one of its links is missing, which duplicates an entry the render already has.
  - Table rows are spliced under a bullet list.
  - **Effect:** deletes structure lines and linkless entries, and duplicates entries. No bug link is lost.
  - **Corpus:** 0 on the path, because neither Step 12 template renders a Bug Reports list. The shapes exist in tracked lists: with a rendered list, tasks 116, 42, 76 and 94 would lose 12 structure lines, and task.120's two-link line would duplicate.
  - → Key an entry by its first link, and carry the old block's unmatched remainder whole rather than as loose lines. Or state in both Step 12 notes that a render must not include a Bug Reports list.
- **[low] REL-027** `shared/resources/qa-results.js:138`. This is the REL-023 residue: `**Bug Reports**` (a bold label, which gate 8 named), `### Bug Report` (singular) and `### Bugs` still match nothing, so the list is dropped while the write reports `replaced`.
  - **Effect:** deletes.
  - **Corpus:** 0 lists that `create-bug-report` wrote use these shapes (it writes the exact `### Bug Reports`). One bold label exists, in task.83. It sits inside QA's own `### QA Reports` list, so QA owns it.
  - → Match a bold label and the singular form, or state the exact heading as the contract in `create-bug-report` Step 5.

**Pre-existing, not introduced by this change (Step 5b), routed to `recommendations.future`.** The orchestrator's route-2/2b step records carried ids "on the work item under **Deferred Work**" (develop-pipeline-step-5-6-qa-loop.md), without saying where. task.141 placed its `### Deferred Work` inside the QA section. It was written by commit `76bb1e8a`, and a later replace deletes it. Gate 8 classed it as QA-owned. The develop base behaves the same way: Step 12 already required a whole-section replace. **Effect:** deletes. **Corpus:** 1 (task.141). The ids also persist in the gates' `recommendations.future`.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none: new engine, wired into Step 12)
- [x] Code on feature branch with open PR (#537, OPEN)

### Testing Approach

- [x] Automated Testing (unit, wiring, corpus; full `ci:fast`)
- [x] Regression Testing (differential corpus against the gate-8 engine)
- [x] Security Review (reasoned; `boundary: internal`, unchanged)
- [x] Code Review (Step 3b, one Explore subagent over the scoped diff)
- [x] Fault injection and inside-span ownership measurement

### Review Methodology

Direct tools plus one read-only Explore code reviewer. The reviewer returned 5 findings in about 2 minutes, before any gate was written.

Re-review scope: files changed since gate 8 (head a89f20feb089; 5 files) — default. That covers the engine, its two generated copies, the engine tests and `CHANGELOG.md`. `SAFETY_REPROBE=false`, because gate 8's security axis was `PASS reasoned`.

Step 4b: not applicable to this cycle's scope. No `SKILL.md` or `shared/resources/*.md` changed since gate 8, and gate 8 ran it over both `SKILL.md` files with 0 findings.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Engine | CONCERNS | Verified | Carry fixed for every tracked shape; four low defects in the new carry and peel code |
| 2: Step 12 wiring (qa-task, qa-story) | PASS | Verified | Unchanged since gate 8; 8/8 wiring tests |
| 3: task.65 repair | PASS | Verified | Unchanged |
| 4: Corpus test | PASS | Verified | Corpus test green |

**Overall Phase Completion**: 4/4 (phase 1 with low findings)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| At most one section; never inside the log | 0 violations | 1,988 docs with 1 section after 4 writes, and 0 inside a log. The 2 docs with 0 sections are the known REL-011 `unplaceable` pair | PASS |
| Replace whole, never stack | idempotent | A 5th identical write changed 0 of 1,988 docs (QA engine alone). A render that ends in a comment stacks (REL-024; 0 instances) | PASS (with REL-024) |
| Nothing outside the span lost | 0 lines | 0 (QA engine alone, 1,990 docs × 4 writes). The 195 lines lost with Change Log writes are header rows that `upsertChangeLog` migrates, the same count as the gate-8 engine | PASS |
| Refuse `multiple` / `unbounded` / `unplaceable` | no write | Fault injection: 4 fence shapes gave `unbounded` for all 155 sections, and a comment or a stray tick gave 155 `replaced`, with 0 lines lost | PASS |
| All tests passing | 100% | `ci:fast` 4,781 tests: 4,780 pass, 0 fail, 1 skipped (EXIT 0) | PASS |
| Lint / format | clean | `format:check` is part of `ci:fast` (EXIT 0) | PASS |

---

## Breaking Changes Validation

None. The engine is additive, and Step 12's wiring is unchanged since gate 8.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

REL-024, REL-025, REL-026 and REL-027, as described under New Findings This Cycle. No bug file was filed: low findings go in this report only.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4 (plus 1 pre-existing, routed to future)

---

## NFR Assessment

### Performance — PASS
The 57 engine tests run in about 0.2 s. The 1,990-document, 4-write corpus run takes seconds, and the 12,493-position fence sweep takes 11 s.

### Reliability — CONCERNS
Nothing outside the span is lost, and all 11 tracked lists are kept. Two silent deletion paths remain inside the span, both off-template with 0 tracked instances on the path: REL-026 (a rendered list drops old linkless lines) and REL-027 (near-miss headings). A stacking path also remains (REL-024). Gate 8 rated this axis CONCERNS for the same kind of deletion path.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- A pure string transform: no network, no shell, no file I/O. `boundary: internal` is unchanged. The inputs are a pipeline-written work item and a pipeline-rendered section, and no corpus sink models this section.

### Maintainability — PASS
`CARRIED_SUBSECTIONS` stays a closed, commented list, and every new branch has a mutation-proven test. One guard has no test: the fold's dedupe of identical bodies (`no-red-untested`, cosmetic).

---

## Code Review

Step 3b ran over the scoped diff (5 files, with the cycle-9 delta first). The task runs with `code_review_blocking=true`.

**Correctness bugs (4):**
- [medium/high] `shared/resources/qa-results.js:248`: CR-1, a trailing comment in the render stacks one copy per cycle. Reproduced: 4 copies after 4 writes. **Promoted as REL-024 and re-rated low**: it duplicates and never deletes, it has 0 tracked instances, and no Step 12 template renders a comment. Gate 6 set the precedent for re-rating a promoted finding on measured conditions.
- [medium/high] `shared/resources/qa-results.js:149`: CR-2, a `####` block carries QA's own later `####` text. Reproduced. **Promoted as REL-025 and re-rated low** (duplicates, 0 instances).
- [medium/medium] `shared/resources/qa-results.js:197`: CR-3, a multi-link old line is re-added when any link is missing. Reproduced. Merged into **REL-026**.
- [low/high] `shared/resources/qa-results.js:250`: CR-4, the walk-back to an unrelated earlier comment. Reproduced. Merged into **REL-024**.

**Cleanups (1):**
- `shared/resources/qa-results.js:205`: CR-5, spliced table rows render as a paragraph under a bullet list. Merged into REL-026.

Boundary rule: `boundary: internal` (unchanged). `mergeCarried`, `collectBlocks` and `trimSeparator` are span transforms. Their only inputs are a work item this pipeline writes and a section it renders, and no corpus sink models them. They were exercised instead by the corpus runs and the fault sweep.

Mutation proofs (isolated copy; the live engine is byte-identical to its snapshot; the baseline was 57/57 before and after):

```
mutation-proven: fold of later blocks removed (old.slice(1,1)) → M1 REL-020 → covered
mutation-proven: RE_QA_FIELD stop removed → M2 REL-021 → covered
mutation-proven: heading regex back to exact ### Bug Reports → M3 REL-023 → covered
mutation-proven: render-with-list merge removed → L2 → covered
mutation-proven: comment peel disabled → M4 REL-022 → covered
mutation-proven: block stop widened to #### → M6 → covered
mutation-proven: fold dedupe of identical bodies removed → no test red → no-red-untested (duplicates only)
```

Six of the seven were proven `covered`; the seventh is untested.

Provenance (5b): REL-024 through REL-027 are new to this branch, because the carry and the peel exist only here. The Deferred Work deletion is pre-existing (the develop base replaced the section whole), so it is routed to future.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Differential run against the gate-8 engine, 1,990 docs × 4 writes, plain render | Identical reasons. Spans differ in 4 docs: task.117 and task.45 now keep the template comment out of the span, and task.70 and task.75 keep a second trailing `---` out. The corpus stays idempotent |
| Same, with a render carrying its own list | Gate-8 engine: 84 bug links lost across 19 docs. This engine: 20 lost across 8 docs, all in QA's own `### Key Findings` or `### QA Reports`, the same 20 as with a plain render |
| Inside-span ownership, all 155 tracked spans grouped by subsection | 2,926 lines replaced, all QA-owned (Test Coverage, Key Findings, QA Report, cycle logs), with 0 comments. The exception is task.141's `### Deferred Work`, written by the route-2b step (pre-existing, above) |
| `ci:fast` | 4,781 tests: 4,780 pass, 0 fail, 1 skipped |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/qa-results.js` (and its generated copies in `skills/qa-task/references/` and `skills/qa-story/references/`, byte-identical apart from the header)
- `shared/resources/tests/qa-results.test.mjs` (M1–M6, L1–L4)
- `skills/create-bug-report/SKILL.md` Step 5, both modes (read to establish who owns what)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` route 2/2b (Deferred Work)

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js   # 66/66
npm run ci:fast                        # 4,781 tests, 4,780 pass, 0 fail, 1 skipped, EXIT 0
npm run bundle:check                   # 129 skills, 0 problems
npm run validate -- skills/qa-task/    # pass
npm run validate -- skills/qa-story/   # pass
# scratch harnesses (outside the repo): corpus.js <engine> plain|withlist (with and without upsertChangeLog),
# fault.js <engine> (6 single-fault shapes x 155 sections + 12,493-position fence sweep), probes.js (targeted repros)
```

### Coverage Report
Not instrumented (plain `node --test`); every new branch was mutation-proven above.

---

## Recommendations

### Immediate Actions (Blocking)
None blocking under the deterministic rules: there are no high or medium findings. The CONCERNS verdict comes from the Reliability axis.

### Short-term Actions (Non-Blocking)
1. REL-024: restrict the comment peel to a lead-in directly before the log, and add a replace-twice test with a trailing comment.
2. REL-025: end a carried block at a heading at or above its own level.
3. REL-026: key merged entries by their first link and carry the unmatched remainder whole, or forbid a rendered list in both Step 12 notes.
4. REL-027: match a bold `**Bug Reports**` label and the singular form, or make the exact heading a stated contract.
5. Pre-existing: say where the route-2/2b step writes Deferred Work. Put it outside the QA section, as task.155 itself does with `## Deferred Work`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The gate-8 findings are fixed or mostly fixed, and nothing outside the span is lost. Four low defects in the new carry and peel code remain, and two of them delete content on off-template paths. By the rules gate 8 used, that keeps Reliability at CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: REL-024 through REL-027 are fixed, or recorded as known limits in the task's Deferred Work.

---

**QA Report**: co-located at `task.155.qa.9.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.9.qa-results-section-engine.yml`
**Next Steps**: Operator decision on the final granted cycle: fix the four lows, or defer them as known limits and proceed to 5c / finalise.
