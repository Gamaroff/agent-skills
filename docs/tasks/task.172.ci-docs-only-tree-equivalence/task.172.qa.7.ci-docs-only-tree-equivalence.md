# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.7.ci-docs-only-tree-equivalence.yml](./task.172.gate.7.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: PASS

---

## Executive Summary

This is the gate the loop owed cycle 6's fix (`7074282a`), granted by a second one-cycle extension of the QA budget. Both cycle 6 findings are fixed and mutation-proven. No HIGH and no MEDIUM finding. One LOW regression is reproduced: a configuration whose `ci` key is quoted, or whose top-level keys are all uniformly indented, was honoured by the cycle 5 engine and is now refused with exit 2 (fails closed). Two further residuals are recorded; neither is attributable to this change.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Cycle 6 finding | Status | Evidence |
| --- | --- | --- |
| CR6-1 a list of maps elsewhere made the check refuse the file | FIXED | the documented `developBatch.resources` and `retrospective.identities` shapes parse, with and without `ci`, with the opt-out before and after, and through git (reason `disabled`); scoping back to the whole file and a `ci` block that never ends each turn `CR6-1` red (re-run here) |
| CR6-2 one miscount offset a dropped row | FIXED | duplicated opt-out refused in both orders with a one-element list of maps before and after `ci`; reverting the three edits turns `CR6-1` and `CR6-2` red; disabling the check turns `CR5-2` and `CR6-2` red (re-run here) |
| LOW: marker with a trailing comment | FIXED | `--- # note` is a marker; not stripping the comment turns `CR6-3` red |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open at the cycle 6 head (`2991a820`; the fix is `7074282a`)
- [x] 93 engine tests pass, and also under `TMPDIR=/tmp` (93 of 93)
- [x] `npm run validate -- skills/finalise/` passes; `npm run bundle:check` reports 129 skills, 0 problems
- [x] The cycle 6 fast gate (4,906 of 4,909; the three non-passes being two load-sensitive file-time budgets and one skipped) is the fix cycle's own record and was not re-run here

### Review Methodology

Re-review scope: default, files changed since gate 6's head (`8dbbac1e`, an ancestor of HEAD); no refute pass (cycle 7); no safety re-probe (gate 6: security CONCERNS with `reasoned` evidence, no HIGH open, not FAIL). The scoped patch handed to the reviewer was the fix commit's own 242-line delta on the engine, its test file, `configuration.md` and `CHANGELOG.md`. One independent read-only Explore reviewer (about 76 s), told to execute candidates against `parseConfig`; it ran about 22. QA reproduced each of its findings, and ran the same four shapes against the cycle 5 engine (`git show 8dbbac1e:` into a scratch copy) to attribute them. Step 4b: not applicable, the delta touches no `SKILL.md` or shared prompt.

Re-review scope: files changed since gate 6 (head 8dbbac1e; 7 files) — default

---

## New Findings This Cycle

- **[low]** `ciBlockRows` recognises only an unquoted `ci:` at column 0, so a valid configuration with a quoted `ci` key or uniformly indented top-level keys is refused with "has 0 row(s) under ci" (CR7-1), reproduced; the cycle 5 engine accepted and honoured all four shapes tested.
- **[low, residual, not attributable]** a `ci` block nested under another key, or a block whose `docsOnly` children are dedented to column 0, is read as the defaults (reviewer CR-1/CR-2, reproduced). Both are valid YAML that mean something else, the cycle 5 engine behaved identically, and no reader can tell them from the owner's intent. In `recommendations.future` as a documentation or an empty-`docsOnly` question.
- **[low, cleanup]** `significantLines` keeps a second comment-stripping rule beside `yaml-subset.js`'s (reviewer CR-3). No input was found where the row decision differs. Supersedes gate 6's CR-4.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | PASS | CR7-1 is a rare-shape LOW that fails closed |
| Phase 3: call sites | PASS | unchanged; callers read any non-zero exit as not tree-equivalent |
| Phase 4: config and docs | PASS | `configuration.md` states the `ci`-block rule and that other sections are not held to it |

---

## Issues Found

### LOW Severity Issues (1)

- **CR7-1**: a quoted `ci` key or uniformly indented top-level keys are refused (see the gate). LOW, so no separate bug file.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
CR7-1 fails closed: a refused configuration costs a full CI wait, never a wrong green.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Every shape this task found to drop an opt-out silently is now refused or read: a BOM, a duplicated or dedented row inside `ci`, a list of maps elsewhere. What remains (a `ci` block nested under another key, a row dedented to column 0) is valid YAML with a different meaning, identical in the cycle 5 engine, and recorded as a residual. No corpus sink models this predicate.

### Maintainability — PASS
The check is scoped to the block the engine reads, is small, and is held by tests that go red on revert. Seven cycles were spent on one lenient reader; the structural alternative (a dedicated strict reader for the `ci` block) is in `recommendations.future` rather than a requirement, because the last two cycles' findings were a regression and a LOW.

---

## Code Review

**Correctness bugs (2):** CR7-1 (reviewer CR-1, low, reproduced) in the gate; the reviewer's CR-2 is the residual above (not attributable). **Cleanups (1):** the second comment-stripping rule (reviewer CR-3).

Provenance: CR7-1 is in code cycle 6 added (the cycle 5 engine accepted the same inputs, run here against `8dbbac1e`); the residual is identical in both engines.
Boundary rule: `parseConfig` is a validator and the corpus has no sink for a skills configuration; `boundary: internal` — its only input is `skills-config.yaml`, which the owner writes, and the work item's own tests hold its refusals. `probes_executed: 0`; the executions above are ad hoc reproductions, not corpus probes.
mutation-proven: scope the check back to the whole file's rows → CR6-1 test → covered
mutation-proven: a `ci` block that never ends at the next column-0 row → CR6-1 test → covered
mutation-proven: do not strip the trailing comment before the marker test → CR6-3 test → covered
mutation-proven: revert the scoping, the `1 + consumedRows(parsed.ci)` and the map-element count together (cycle 5 behaviour) → CR6-1 and CR6-2 tests → covered
mutation-proven: disable the refusal → CR5-2 and CR6-2 tests → covered
The map-element branch of `consumedRows` on its own is `no-red-dead`: no shape inside the `ci` block reaches it, so reverting it alone reds nothing; it is exercised only through the combined revert. All five mutants were applied from a `cp` snapshot that was restored and compared byte for byte afterwards.

---

## Regression Testing

- 93 engine tests pass under both temp values.
- Bundle freshness: 129 skills, 0 problems.
- Hosted CI on the cycle 6 head is read once, at `/finalise`.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR7-1: find the `ci` block from the parser's own rules, or refuse with a message that says what is wrong.
2. Residual (nested `ci`, dedented children): document it in `configuration.md`, or refuse an empty `docsOnly:` that has a sibling row.
3. Export the parser's own row reader; the CANCELLED ancestor note from gate 5.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM open; one reproduced LOW that fails closed; the cycle 6 fixes are verified and mutation-proven.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.172.qa.7.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.7.ci-docs-only-tree-equivalence.yml`
**Next Steps**: route 2b (cosmetic residue) carries CR7-1 and hands to the PR conformance review (5c)
