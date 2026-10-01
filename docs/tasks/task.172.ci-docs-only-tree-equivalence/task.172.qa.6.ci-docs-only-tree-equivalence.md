# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.6.ci-docs-only-tree-equivalence.yml](./task.172.gate.6.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

This is the gate the loop owed cycle 5's fix (`e5547550`), granted by a one-cycle extension of the QA budget. The three cycle 5 findings are fixed and each fix is mutation-proven by this cycle. No HIGH finding. The review found two MEDIUM defects, both in the completeness check that fix added: its row count over-counts every list-of-maps element, so a valid, documented `skills-config.yaml` is refused with exit 2 (a regression, and a fail-closed one), and the same over-count lets a dropped row pass when it offsets one.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 5 finding | Status | Evidence |
| --- | --- | --- |
| CR5-1 BOM defeats the parse when a key or marker precedes `ci` | FIXED | one BOM strip in `parseConfig`; removing it turns the CR5-1 test red (re-run here) |
| CR5-2 rows the parse does not consume are dropped | PARTIAL | the check refuses the shapes it was written for and the CR5-2 test goes red on revert (re-run here), but the count is inexact: CR6-1 and CR6-2 |
| CR5-3 mode check and read anchored differently | FIXED | `git ls-tree --full-tree`; removing it turns the CR5-3 test red (re-run here) |
| LOW: CANCELLED ancestor re-asked | DOCUMENTED | comment in the engine header, the 6c poll and `configuration.md`; still in `recommendations.future` |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open at the cycle 5 head (`8dbbac1e`; the fix is `e5547550`)
- [x] 90 engine tests pass, and also under `TMPDIR=/tmp` (90 of 90)
- [x] `npm run validate -- skills/finalise/` passes; the three bundled copies of the engine are the source plus its one `AUTO-GENERATED` header line
- [x] The cycle 5 fast gate (4,903 of 4,906, the three failures being the load-sensitive file-time budgets) is the fix cycle's own record and was not re-run here

### Review Methodology

Re-review scope: default, files changed since gate 5's head (`f3887635`, an ancestor of HEAD); no refute pass (cycle 6); no safety re-probe (gate 5: security CONCERNS with `reasoned` evidence, no HIGH open, not FAIL). The scoped patch handed to the reviewer was the fix commit's own delta on the engine, its test file, `finalise/SKILL.md`, `configuration.md` and `CHANGELOG.md` (290 lines; the whole-branch patch of those paths is 7,681 lines and almost all of it is cycles 1 to 4, so it was not used). One independent read-only Explore reviewer (about 73 s). QA had already found CR6-1 by executing the new check against a documented configuration before the reviewer returned; the reviewer reproduced it independently and found CR6-2 and a LOW. Step 4b: not applicable to the delta beyond `finalise/SKILL.md`, whose edit is a comment-only change inside an existing block (cycle 5's run: 36 blocks, 0 runnable, 2 placeholder, the rest mutating).

Re-review scope: files changed since gate 5 (head f3887635; 15 files, delta reviewed on 5 of them) — default

---

## New Findings This Cycle

- **[medium]** `consumedRows` over-counts every list-of-maps element; a valid documented configuration (`developBatch.resources`, `retrospective.identities`) is refused with exit 2 (CR6-1), reproduced; the cycle 4 engine accepted it.
- **[medium]** the equality check is offset by the same over-count, so a duplicated opt-out passes in a file that also holds a list of maps (CR6-2), reproduced in the order that turns the rule on.
- **[low]** a document marker with a trailing comment (`--- # c`) is counted as a row the parse never consumes (reviewer CR-3), reproduced; in the gate's `recommendations.future`.
- **[low, cleanup]** the check keeps a second row tokenizer beside `yaml-subset.js`'s (reviewer CR-4), in `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | CONCERNS | CR6-1, CR6-2 |
| Phase 3: call sites | PASS | unchanged since gate 5; callers read any non-zero exit as not tree-equivalent, so CR6-1 fails closed |
| Phase 4: config and docs | PASS | `configuration.md` states the completeness rule; it should say a list of maps is read once CR6-1 is fixed |

---

## Issues Found

### MEDIUM Severity Issues (2)

- **CR6-1**: [task.172.bug.24.list-of-maps-config-refused-by-the-row-count.md](./task.172.bug.24.list-of-maps-config-refused-by-the-row-count.md)
- **CR6-2**: [task.172.bug.25.row-count-net-defeated-by-an-offsetting-miscount.md](./task.172.bug.25.row-count-net-defeated-by-an-offsetting-miscount.md)

### LOW Severity Issues (2)

- A document marker with a trailing comment is refused (reviewer CR-3).
- Two row tokenizers (reviewer CR-4, cleanup).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
CR6-1 fails closed: the three callers read any non-zero exit as "not tree-equivalent", so a refused configuration costs a full CI wait, never a wrong green.
### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- CR6-2 is an owner opt-out the engine can ignore. Both findings were reproduced by direct execution of the exported `parseConfig`. No corpus sink models this predicate, so no probe was run.

### Maintainability — CONCERNS
Six cycles on one mechanism, reading `skills-config.yaml` through a lenient YAML subset. Cycle 5 replaced per-spelling guards with a total row count; the count is itself an approximation and its three defects (CR6-1, CR6-2, the marker) share one cause. The exact form is a completeness check scoped to the `ci` block, whose shapes (mappings, lists of scalars) count exactly, or the parser reporting the rows it skipped.

---

## Code Review

**Correctness bugs (4):** CR6-1 and CR6-2 in the gate, reproduced; the marker case (reviewer CR-3, low) and the reviewer's CR-1/CR-2 are the same two. The reviewer rated its CR-1 `high`; QA rates it MEDIUM because it fails closed and loses the shortcut rather than returning a wrong answer. **Cleanups (1):** the second tokenizer (reviewer CR-4).

Provenance: both findings are in code cycle 5 added; the cycle 4 engine accepted the same inputs (run here against `f3887635`).
Boundary rule: `parseConfig` is a validator, and the corpus has no sink for a YAML configuration; `boundary: internal` — its only input is `skills-config.yaml`, which the owner writes, and the work item's own tests hold its refusals. Recorded as `internal_reason`: no corpus sink models a skills configuration. `probes_executed: 0`; the executions above are ad hoc reproductions, not corpus probes.
mutation-proven: remove the BOM strip in `parseConfig` → CR5-1 test → covered
mutation-proven: disable the row-count refusal → CR5-2 test → covered
mutation-proven: remove `--full-tree` from the `git ls-tree` call → CR5-3 test → covered
All three were run by this cycle against the committed engine, each from a `cp` snapshot that was restored and compared byte for byte afterwards. They show the fixes are held by tests; they do not show the row count is correct, which is what CR6-1 and CR6-2 are about, and no committed test uses a list of maps.

---

## Regression Testing

- 90 engine tests pass under both temp values.
- Bundled copies match the source modulo the header line.
- Hosted CI on the cycle 5 head is read once, at `/finalise`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR6-1 and CR6-2 together, with a test that is red on revert for each documented list-of-maps shape and for the offset shape in both orders. Prefer scoping the completeness check to the `ci` block over a third spelling of the count.

### Short-term Actions (Non-Blocking)
1. Marker with a trailing comment, second tokenizer, CANCELLED ancestor: in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH open; two reproduced MEDIUM findings remain, both in the completeness check the last cycle added.
**Quality Score**: 75/100

**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.172.qa.6.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.6.ci-docs-only-tree-equivalence.yml`
**Next Steps**: this is the last budgeted cycle: qa-fix cycle 6, then the loop-limit half-cycle gate if the route allows it, else escalation
