# QA Report: Task 100 - the false-RED mirror in mutation-proving (cycle 3, verification)

**Task**: [Link to task document](./task.100.mutation-proving-false-red.md)
**Gate File**: [task.100.gate.3.mutation-proving-false-red.yml](./task.100.gate.3.mutation-proving-false-red.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: PASS

---

## Executive Summary

All three cycle-2 findings are closed and no new finding replaced them — which is the outcome cycle 2 could not assume, since both of its own findings were introduced by cycle 1's fix. The deliverable meets all five success criteria, the change remains additive, and the full hermetic suite plus the eval tier are green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools. **Re-review scope: since gate 2 (default).** `PRIOR_GATES=2` and `SAFETY_REPROBE=false` (gate 2's security axis read `status: PASS` / `evidence: reasoned` — the "OK reasoned" case), so the narrowing applies: the only files changed since gate 2 are `shared/resources/mutation-proving.md` and its six regenerated copies.

The narrowing was **not** taken as licence to only confirm. The cycle-2 replacement text was read adversarially in its own right, on the explicit ground that cycle 2's findings were both self-inflicted — a fix is new text, and this cycle's fix is the least-reviewed text in the change set.

---

## Re-Review Context

| ID | Cycle 2 finding | Status | Verification |
| :-- | :--- | :--- | :--- |
| `TASK-100-002` | `2/N` overhead miscounts the matrix baseline; percentages 2× too high | **FIXED** | Every percentage and both ratio expressions are gone — `grep -E "40%\|10%\|2/N\|1/N\|surcharge"` returns nothing. Replaced by the count-independent comparison, which was then checked rather than accepted: the procedure does run the suite twice per invariant (step 3 mutated, step 5 restore-and-confirm), one mutation therefore costs two runs, and two extra runs is exactly one mutation's worth. The claim is arithmetically correct and needs no denominator agreement. |
| `TASK-100-003` | "That `diff`" ambiguous against "There is a real diff" earlier in the paragraph | **FIXED** | The pronoun is gone; the sentence now names the mechanism — "The applied-check closes the *"nothing happened"* case." No `That \`diff\`` remains in the file. |
| `TASK-100-004` | 96-column line in a file wrapped at ~83 | **FIXED** | 0 prose lines over 85 columns in the new section. Table rows remain long, which matches the file's existing tables and is not a wrap violation. |

---

## New Findings This Cycle

**None.**

Scoped to files changed since gate 2 (`shared/resources/mutation-proving.md` + 6 regenerated copies), and within that scope the cycle-2 replacement text was attacked specifically on the axis that produced both prior findings — is any quantitative or referential claim in it unchecked?

Four claims were re-derived from source rather than read:

1. *"checks 1 and 2 each run that command"* — true by the definition of checks 1 and 2 in the same list.
2. *"The procedure above already runs the suite twice per invariant — once mutated at step 3, once restored at step 5"* — verified against `## The procedure`: step 3 is *"Re-run the suite"*, step 5 is *"Restore the source. Confirm green again."*
3. *"Adding two more is roughly one extra mutation's worth, at any N"* — one mutation costs two runs, so two extra runs is one mutation's worth exactly; "roughly" absorbs the diff. The statement is absolute rather than a ratio, so it does not depend on how a reader counts the matrix.
4. *"one run is 0.3 s scoped to a file and 54 s across the whole suite"* — both measured (294 ms, 53,966 ms), and framed as a datapoint from this repository rather than as a general law.

---

## Success Criteria Verification

| # | Status | Evidence |
| - | ------ | -------- |
| SC1 | PASS | four signal rows present and bold |
| SC2 | PASS | all four checks present; "in either direction" intact |
| SC3 | PASS | false-RED-worse paragraph untouched across all three cycles |
| SC4 | PASS | "passes the applied-check" intact; row-5 example intact |
| SC5 | PASS | `git diff develop...HEAD` on the source still shows exactly **1** deleted line — the frontmatter `description`, extended not truncated. Three cycles of edits have not touched the false-GREEN material. |

---

## NFR Assessment

### Performance — PASS
No runtime code.

### Reliability — PASS
Still purely additive; rollback (delete section, re-bundle) unchanged.

### Security — PASS
- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- Three cycles have added no code, no command and no new fenced block. Verdict reached by reading, so `reasoned` remains accurate.

### Maintainability — PASS
The axis that was CONCERNS in cycles 1 and 2 is now clear. Both unverified quantitative claims are gone — the first replaced, the second removed rather than re-derived — and what remains is a comparison a reader can check against the procedure two sections above without doing arithmetic.

---

## Code Review

Scoped to the cycle-2 diff.

**Correctness bugs (0):** none. The four claims in the replacement text were re-derived from source (above) rather than accepted.

**Cleanups (0):** none outstanding.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `npm run ci:fast` (post cycle-2 fix) | PASS — exit 0, 3023 tests, 3022 pass, 0 fail, 1 pre-existing skip |
| `npm run eval:all` | PASS — exit 0 (run at cycle 1; no eval-relevant file changed since) |
| `prettier --check` | PASS — clean |
| Bundle integrity, all six copies | PASS — 1 divergent line each (the `AUTO-GENERATED` banner) |
| Snippet gate | PASS — 3 blocks, all refused as `mutating`, 0 findings |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All three cycle-2 findings closed, no new findings, all five success criteria met including the row-5 anti-vacuity check the task set as its own falsification test. Full suite and eval tier green; the change remains additive with a single extended frontmatter line as its only deletion.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**Next Steps**: Step 5c `/review-pr` — the loop's exit gate — then `/finalise`.
