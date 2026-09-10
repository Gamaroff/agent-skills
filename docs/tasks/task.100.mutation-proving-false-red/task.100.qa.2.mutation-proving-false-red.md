# QA Report: Task 100 - the false-RED mirror in mutation-proving (cycle 2)

**Task**: [Link to task document](./task.100.mutation-proving-false-red.md)
**Gate File**: [task.100.gate.2.mutation-proving-false-red.yml](./task.100.gate.2.mutation-proving-false-red.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's finding is genuinely fixed — the unmeasured constant is gone. But the **replacement is itself wrong**, and in the same way: it states a ratio (`2/N`) that nobody checked against what a mutation matrix actually costs. The procedure this document defines is per-invariant and runs the suite **twice** per mutation (step 3 mutated, step 5 restore-and-confirm-green), so an N-mutation matrix pays ~2N runs and probe validation adds ~`1/N`, not `2/N`. The stated surcharges are exactly 2× too high.

This is the refute pass doing its job. A narrowed cycle-2 review would have read only the fix, seen the constant correctly replaced, and passed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-100-002, then merge.

---

## Review Methodology

Direct tools (subagent dispatch barred by session policy; the diff is one file and small enough to read whole).

**Re-review scope: unscoped — cycle 2 is a mandatory full refute pass.** `PRIOR_GATES=1` → `REFUTE_PASS=true`, whole-branch diff re-read to find what is false rather than to confirm the fix. `SAFETY_REPROBE=false` — the prior gate's security axis read `status: PASS`, `evidence: reasoned`, which is the "OK reasoned" case and does not trigger the carve-out.

The four transition probes in the refute directive (bulk teardown, in-flight, error path, reconnect) have no analogue in a prose deliverable and were not forced onto it. What was carried over is the directive's actual instruction — **start with cycle 1's fixes, because a fix is new code, not the closure of a finding.** Both new findings below are in text that did not exist before cycle 1.

---

## Re-Review Context

| ID | Cycle 1 finding | Status | Verification |
| :-- | :--- | :--- | :--- |
| `TASK-100-001` | "The three cost about twenty seconds" — unmeasured constant | **FIXED** | The constant is gone. Cost is now stated as a multiple of the matrix command ("two more runs … plus a diff"), with the measured spread (0.3 s scoped / 54 s whole-suite) given as the reason no constant could be right. The §8 requirement that check 4 carry no time claim still holds — re-verified by grep over the judgement paragraph. |
| LOW-1 | bare `Step 2` ambiguous against the section's own item 2 | **FIXED, with a new defect introduced** | Both references now name the procedure. But the second was rewritten to "That `diff`", which re-opens a referent question of its own — see TASK-100-003. |
| LOW-2 | `description` at 95 words | **No action, as agreed** | Unchanged at 95 words. Inside the ~100 guidance. |

---

## New Findings This Cycle

Unscoped refute pass over the full `origin/develop...HEAD` diff, 10 files. Both findings are in text introduced by cycle 1's fix.

### MEDIUM

**TASK-100-002 — the replacement ratio miscounts the matrix's own cost, and is 2× too high**

- **File**: `shared/resources/mutation-proving.md:152-156`
- **Observation**: the text says *"a matrix of N mutations already pays N runs of that command, so validating the probe first adds `2/N`. At five mutations that is a 40% surcharge; at twenty it is 10%."*

  A matrix of N mutations does **not** pay N runs. `## The procedure`, in this same document, is a per-invariant loop with two suite runs in it — step 3 *"Re-run the suite"* and step 5 *"Restore the source. Confirm green again."* So N mutations cost ~2N runs, and two extra runs is:

  | N | Matrix actually pays | Validation overhead | Document claims |
  | :-- | :--- | :--- | :--- |
  | 5 | 10 runs | **20%** | 40% |
  | 20 | 40 runs | **5%** | 10% |

- **Impact**: the document overstates the cost of its own rule by a factor of two, in the paragraph arguing the rule is cheap enough not to skip. Materially, the surcharge is half what it says — so the argument is stronger than stated, and the number is still wrong. And a false arithmetic claim in the section that exists to stop false claims has the same problem the original constant had; replacing an unchecked constant with an unchecked ratio is not progress.
- **Recommendation**: drop the fragile percentage arithmetic rather than re-deriving it against a denominator readers may count differently (some run one restore at the end rather than per invariant). State the robust form: probe validation adds two runs to a matrix that already pays about two per mutation, so it costs **roughly one extra mutation's worth, at any N**. True whichever way the reader counts, and more intuitive than a percentage.
- **Priority**: P2

### LOW

**TASK-100-003 — the LOW-1 fix traded one ambiguous referent for another**

- **File**: `shared/resources/mutation-proving.md:184`
- **Observation**: the sentence now reads *"That `diff` closes the "nothing happened" case."* Three sentences earlier the same paragraph says *"There is a real diff"*, meaning the mangled edit's actual diff output. So "That `diff`" can be read as the mangled edit's diff — the opposite of the intended referent, which is step 2's diff **check**.
- **Recommendation**: name the mechanism rather than pronoun it — "The applied-check closes the …" removes the referent question instead of relocating it.
- **Priority**: P3

**TASK-100-004 — line-wrap regression from the same edit (informational)**

- **File**: `shared/resources/mutation-proving.md:184` — the rewrite left a ~95-column line in a file wrapped at ~80. `prettier` does not reflow prose so nothing caught it. Fold into the TASK-100-003 edit.

**Total new this cycle**: MEDIUM: 1, LOW: 2.

---

## Implementation Verification

Unchanged from cycle 1 — 4/4 phases still complete, all six bundled copies re-verified after the cycle-1 re-bundle as differing from source by exactly one line (the `AUTO-GENERATED` banner), confirming no copy was hand-edited during the fix.

## Success Criteria Verification

Re-verified after the fix; all five still hold.

| # | Status | Evidence |
| - | ------ | -------- |
| SC1 | PASS | 4 signal rows still present and bold |
| SC2 | PASS | all four checks present; "in either direction" intact |
| SC3 | PASS | false-RED-worse paragraph untouched by the fix |
| SC4 | PASS | "passes the applied-check" intact; row-5 example intact |
| SC5 | PASS | false-GREEN material still byte-identical |

---

## NFR Assessment

### Performance — PASS
No runtime code. Unchanged.

### Reliability — PASS
Still purely additive; rollback unchanged.

### Security — PASS
- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- Cycle 1's fix added no code, no command and no new fenced block. Verdict reached by reading, so `reasoned` remains the accurate value.

### Maintainability — CONCERNS
Same axis as cycle 1 and for a sharper reason: the document now carries a **second** unverified quantitative claim, introduced by the fix for the first. Resolving TASK-100-002 clears it.

---

## Code Review

Refute pass over the whole branch diff.

**Correctness bugs (1):**
- [medium/high] `shared/resources/mutation-proving.md:152` — `2/N` overhead miscounts the matrix baseline; each mutation costs two suite runs per this document's own step 3 + step 5, so the real figure is ~`1/N` → state the cost as "roughly one extra mutation's worth" and drop the percentages.

**Cleanups (2):**
- `shared/resources/mutation-proving.md:184` — "That `diff`" referent (TASK-100-003)
- `shared/resources/mutation-proving.md:184` — line-wrap regression (TASK-100-004)

**Note on `code_review_blocking`**: TASK-100-002 is `category: bug` with `confidence: high`, so under the run-level override it would enter `top_issues[]` by that route as well. It is listed once, as a medium — its severity is medium because it misstates a cost in guidance rather than breaking anything executable.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `npm run ci:fast` (post-fix) | PASS — exit 0, 3023 tests, 3022 pass, 0 fail, 1 pre-existing skip |
| `prettier --check` | PASS — clean (note: prettier does not reflow prose, which is why TASK-100-004 survived it) |
| Bundle integrity, all six copies | PASS — 1 divergent line each (the banner) |
| Success criteria | PASS — 5/5 re-verified post-fix |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The cycle-1 finding is properly closed, and every success criterion survives the fix. One new medium stands, introduced by that fix: the ratio that replaced the constant is itself unchecked and 2× too high, because it counts one suite run per mutation where this document's own procedure specifies two. It is a two-sentence fix and does not warrant FAIL — but it does warrant not passing, because "the number is wrong" is the exact finding cycle 1 raised.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-100-002 resolved.

---

**Next Steps**: `/qa-fix` cycle 2 — replace the percentage arithmetic with the count-independent form, and fold in TASK-100-003/004 while in the file. Then cycle 3 verification and Step 5c `/review-pr`.
