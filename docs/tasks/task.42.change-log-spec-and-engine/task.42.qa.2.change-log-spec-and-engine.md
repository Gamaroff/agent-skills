# QA Re-Review Report: Task 42 - Canonical Change Log spec and shared engine

**Task**: [Link to task document](./task.42.change-log-spec-and-engine.md)
**Gate File**: [task.42.gate.3.change-log-spec-and-engine.yml](./task.42.gate.3.change-log-spec-and-engine.yml)
**Supersedes**: [gate.1 (FAIL)](./task.42.gate.1.change-log-spec-and-engine.yml), [gate.2 (CONCERNS)](./task.42.gate.2.change-log-spec-and-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**Gate Status**: PASS

---

## Executive Summary

Covers QA cycles 2 and 3. All three issues raised across the review are fixed, each pinned by a
regression test that was confirmed to fail against the pre-fix engine — the check that separates
a test which documents a fix from one which merely accompanies it.

The pattern worth recording: **all three defects had the same shape.** A rule stated correctly in
the spec, then applied to a subset of the places it governs — the fence guard on a block's start
but not its end; block selection by declaration order rather than document order; the collapse
sweep scoped to superseded pairs rather than to every pair that can carry a Change Log. Each fix
widened the scope of an existing rule rather than adding a new one, which is why none required
rethinking the design.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Issue | Severity | Raised | Fixed | Status |
|---|---|---|---|---|
| TASK-42-BUG-1 — heading-block end scan ignores fences | HIGH | Cycle 1 | Cycle 2 | ✅ FIXED |
| TASK-42-BUG-2 — dual-legacy collapse order-dependent | HIGH | Cycle 1 | Cycle 2 | ✅ FIXED |
| TASK-42-BUG-3 — duplicate current block never collapsed | MEDIUM | Cycle 2 | Cycle 3 | ✅ FIXED |
| Blank-line seam | LOW | Cycle 2 | Cycle 3 | ✅ FIXED |
| `insideFence` misnamed | LOW | Cycle 1 | Cycle 2 | ✅ FIXED |
| 3-cell legacy row drops a cell | LOW | Cycle 1 | Cycle 2 | ✅ FIXED |

### Verification detail

**TASK-42-BUG-1.** The end-scan now walks `after.matchAll(nextRe)` and skips candidates inside a
protected range, reusing the ranges already computed for the start-scan. Verified:
`extractEntries` returns 2 before the write and 3 after; fences stay balanced; the fenced line is
not promoted to a heading. A second test confirms the guard did not over-reach — a genuine
sibling heading still terminates the block.

The developer correctly pushed back on one part of the report. I had expected the opening fence
to survive the rewrite; it does not, because regenerating a block replaces everything between its
bounds with markers + heading + table. That was always true and is what a Change Log section
*is*. The defect was the block **ending** at the fence — stranding rows outside the log and
orphaning the closing fence — and both are fixed. The residual is documented in the test so it is
not later misread as a regression. **The correction is right and I accept it.**

**TASK-42-BUG-2.** Selection is positional (lowest start index) and the collapse sweeps both
sides. The github-first ordering now yields one block, zero legacy markers, rows in date order.
The dual-pair test is a loop over both arrangements — the specific gap that let this through.

**TASK-42-BUG-3.** `SWEEP_PAIRS` prepends the current pair, and the `alreadyMigrated` skip is
guarded on a non-empty author so the current pair is never skipped. The per-pair sweep became a
loop, since one slice can hold more than one block of the same pair.

---

## Adversarial Re-Probe of the Cycle-2/3 Code

The question a re-review has to answer is not "were the reported bugs fixed" but "did the fixes
break anything". Four probes, chosen where the changes were most likely to have side effects:

| Probe | Why this one | Result |
|---|---|---|
| Three blocks of mixed vintage (current + jira + github) | The widened sweep and positional selection interact here | 1 block, 4 rows — PASS |
| Two CURRENT blocks in one slice | Exercises the new per-pair loop; a single `find` would leave one behind | 1 block, 3 rows — PASS |
| Idempotence over 5 further writes | The seam normalisation could have compounded across writes | 1 block, rows accumulate, no 3+ newline run — PASS |
| **Fenced CURRENT marker pair, after widening the sweep** | **The highest-risk regression: widening what the sweep matches could have let it reach into fenced examples** | still ignored; illustrative row untouched — PASS |

The fourth mattered most. Adding the current pair to the sweep is exactly the kind of change that
quietly re-opens a guard, and it did not — `findMarkerBlock` filters through `protectedRanges` on
every call, so the guard is a property of the finder rather than of its call sites.

---

## Success Criteria — Final Verification

Every criterion in §9 now passes, including the one that failed at cycle 1:

| Group | Result |
|---|---|
| Functional (6 criteria) | **6/6** — including "both legacy marker pairs migrate in place with no duplication", now verified in **both** document orderings |
| Performance (1) | 1/1 — suite 34.5s vs 33.7s baseline with 40 tests added |
| Code Quality (4 + 1 documented deviation) | 4/4 pass; the modified-tests criterion remains not-met and is honestly recorded in §9 with the full account |
| Migration (4) | 4/4 |

---

## NFR Assessment

### Performance — PASS
The two-sided collapse and per-pair loop add bounded passes over slices that shrink as blocks are
removed. No measurable change.

### Reliability — PASS (was FAIL at cycle 1, CONCERNS at cycle 2)
All three silent or invariant-violating paths are closed and pinned by tests. The engine was
additionally verified clean against its own specification document — the fixture most likely to
expose the guard it introduces, and the one that surfaced the inline-code gap during development.

### Security — PASS
Unchanged across all three cycles.

### Maintainability — PASS
Each fix comments the *reasoning error* rather than the change. That is what stops the same
mistake recurring in the next place the rule applies, and given all three defects were the same
mistake in different locations, it is the most valuable thing in the diff.

---

## Code Review

No new findings. The cycle-1 code-review findings (2 bugs, 2 cleanups) are all closed:

- Both bugs → TASK-42-BUG-1 and BUG-2, fixed and tested.
- `insideFence` → `insideProtected`.
- `migrateLegacyRow` 3-cell case → surplus appended to the description rather than dropped, with
  a comment explaining that neither legacy writer ever emitted 3 cells so it can only arise from
  a hand edit.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test                                                # 1144 passing, 0 failing
node --test shared/resources/tests/change-log.test.mjs  # 40/40
npm run bundle && git diff --stat                       # empty — idempotent
node <adversarial re-probes>                            # 4 probes, all PASS
node <pre-fix engine comparison>                        # confirms new tests pin the fixes
```

### Test count progression

| Cycle | Suite total | change-log.test.mjs |
|---|---|---|
| Baseline (before task) | 1104 | — |
| Gate 1 | 1137 | 33 |
| Gate 2 | 1141 | 37 |
| Gate 3 | **1144** | **40** |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open issues. All NFRs PASS. Every fix pinned by a test verified to fail against
the pre-fix engine, and adversarial re-probing of the changed code found no new defects.
**Quality Score**: 100/100 (deterministic formula: no FAILs, no CONCERNS)

Two cycles were needed, which the score does not show — worth stating rather than leaving the
number to imply a clean first pass. The defects were edge cases in an otherwise strong change,
and the review process worked as intended: `code_review_blocking` promoted two high-confidence
correctness bugs into the gate, which is what forced the fix cycles rather than letting them
land as advisory notes.

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**QA Report**: co-located at `task.42.qa.2.change-log-spec-and-engine.md`
**Gate File**: co-located at `task.42.gate.3.change-log-spec-and-engine.yml`
**Next Steps**: Proceed to finalise.
