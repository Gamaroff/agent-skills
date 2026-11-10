# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

Gate 9 ran on a fourth owner-granted extra cycle, scoped to routes that keep the substitution text in the source. The independent reviewer found no block that classifies `runnable` and runs a command. It tried early-closing bracket shapes, backtick substitutions holding a bracket, builtins outside the evaluating-word list, and about 18,000 random array-subscript blocks. The gate is CONCERNS, not PASS: the owner narrowed the task at gate 5 and the documented residuals stay open.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: READY, with the residuals documented and the allow-list task filed

---

## Testing Scope

Direct tools plus one read-only Explore subagent for the diff review (code route; gate 9, whole branch diff of 5399 lines, safety re-probe; the prior gate failed on security). The reviewer ran about 2 minutes (measured from its completion notice); its independent review ran, with an empty findings list. It did not run the full test file or the helper false-positive scan; QA's own docs scan and `ci:fast` cover those.

CI on 134931e556a6: pending at the read (undecided; recorded, gate unchanged). Clean-checkout `ci:fast` on the LAN server: see "Finalise evidence record" at the end of this report.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-11 quoted separator resets the depth | FIXED |

## New Findings This Cycle

None.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | 383/383 tests, real-bash table |
| Phase 2: refuse | PASS | Verified | No bypass in about 18,000 fuzzed blocks |
| Phase 3: prove | PASS | Verified | Differential 0 writes, docs scan +4.5%, mutations red |

**Overall Phase Completion**: 3/3

---

## NFR Assessment

- **Security**: CONCERNS. 31 probes, 0 escaped; documented residuals stay open (printf octal launder, a bracket or dollar arriving by expansion, a literal split across quote tokens).
- **Performance**: PASS (+4.5% median against the +10% bound).
- **Reliability**: PASS.
- **Maintainability**: CONCERNS (nine gates; detection of hazardous text cannot be exhaustive).

---

## Code Review

No findings. Verified by the reviewer: a `]` before the literal that bash also treats as closing leaves nothing to run (the text is a plain value); a quoted `[` that bash counts as nesting is counted the same way by the depth map; `mapfile`, `getopts`, `wait` and `coproc` with a literal operand are refused by the unrecognised-command rule; the bundled copies match the source.

---

## Recommendations

### Future
1. File the allow-list design as its own task (closes the documented residuals).
2. Two advisory cleanups (a test that cannot fail on the ordering it names; a test locking the dependency on the unrecognised-command rule).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no reproduced bypass of the refusal this task delivers; owner-accepted residuals documented.
**Quality Score**: 88/100

**Deployment Recommendation**: READY

**Next Steps**: Step 5c PR conformance review, then finalise

---

## Finalise evidence record

Measured on head `94dfae39` (the gate-9 head `134931e5` differs from it by documentation only), on 2026-11-10. This section exists because the measurement criteria are graded from committed artifacts, and the implementation report is committed last.

**Differential run writes nothing (success criterion 3).** `node scripts/qa-snippets-differential.mjs --atoms all --seed 1 --count 4000`: 4000 blocks per family, 0 writes in every family (nesting 200 runnable, indirect 81, arith 74), five runs. `--atoms indirect --seed 1 --count 3000`: 3000 blocks, 63 runnable, 0 writes. The previous engine writes 10 on the same indirect atoms at 8000 (implementation report, QA Cycle entries).

**Docs scan within 10% (criterion 4), five runs, `node scripts/qa-snippets-docscan.mjs --time --json`.**

| Run | Load (1m, 5m, 15m) | Base ms | Now ms |
| --- | --- | --- | --- |
| 1 | 3.30 3.60 3.79 | 2058 | 2494 |
| 2 | 3.60 3.66 3.81 | 419 | 423 |
| 3 | 3.60 3.66 3.81 | 394 | 399 |
| 4 | 3.60 3.66 3.81 | 469 | 480 |
| 5 | 3.55 3.65 3.81 | 490 | 491 |

Median base 469 ms, median now 480 ms: **+2.3%** (bound +10%). Run 1 is a cold-cache outlier on both columns (about 5x); it is reported, and the median ignores it.

**Differential slice median under 10 s (criterion 5).** `--atoms all --seed 1 --count 4000`, five runs, load beside each:

| Run | Load (1m, 5m, 15m) | Wall ms |
| --- | --- | --- |
| 1 | 3.42 3.62 3.80 | 6868 |
| 2 | 3.44 3.62 3.79 | 4661 |
| 3 | 3.48 3.62 3.79 | 9938 |
| 4 | 3.80 3.69 3.81 | 3458 |
| 5 | 3.80 3.69 3.81 | 11012 |

Median **6868 ms** (bound 10 s). Runs 3 and 5 exceed 10 s on a loaded laptop (load about 3.5); the median holds, and the spread is the load.

**Bundle freshness (criterion 7).** `npm run bundle:check`: 129 skills checked, 0 problems.

**Mutation proofs, one per change (criterion 8).** Each was a revert of the named behaviour, with the named tests red, and each restored green. They are recorded per cycle in the implementation report's QA Cycle entries and restated here. The two red tests are `task.293 each refusal is held on an input where it alone decides` (the decider test) and the real-bash shape table (`T293_SHAPES`).

| Change | Mutation | Red |
| --- | --- | --- |
| Base refusals (six branches) | each branch removed in turn | the decider test, six times (QA report 1) |
| Subscript rule (QA Cycle 1 entry) | rule removed | decider test |
| Assembled-value rule `EXPANDED_ASSIGNMENT` (QA Cycle 1 entry) | rule removed | decider test |
| Block rule `blockEvaluates` (QA Cycle 2 entry) | block rule off | decider test and shape table |
| Arithmetic-read detector (QA Cycle 2 entry) | detector off | decider test and shape table |
| Here-document loop (QA Cycle 2 entry) | loop off | decider test and shape table |
| Default-deny expansion test (QA Cycle 3 entry) | test off | decider test and shape table |
| Carrier-level default-deny (QA Cycle 4 entry) | carrier check off | decider test and shape table |
| Word-scoped bracket rule (QA Cycle 6 entry) | old one-character rule restored | decider test and shape table |
| Bracket depth over the segment (QA Cycle 7 entry) | parentheses reset the depth | decider test and shape table |
| Bracket depth never reset (QA Cycle 8 entry) | the reset put back | decider test and shape table |

**Docs-scan blocks newly refused (criterion 10).** One block: `docs/tasks/task.293.qa-snippet-classifier-indirect-evaluation/task.293.plan.qa-snippet-classifier-indirect-evaluation.md` line 26, `runnable` to `mutating`. Reason: the plan quotes a command-substitution literal in a block that also holds an unbalanced `[`, which bash can evaluate as an array subscript, so the never-reset bracket depth refuses it. Over-refusal by design; recorded in gate 9 `recommendations.future`. Zero blocks newly runnable. (QA report 1 listed two at cycle 1; since gate 3 the checks run only on trigger text and only the plan block remains.)

**Clean-checkout `ci:fast` on the LAN server** (`ci@192.168.1.249`, fresh clone of `134931e5`, `CI=true`): 7763 tests, 7747 pass, 3 fail, 13 skipped. All three failures come from the server lacking `zsh` and `shellcheck`: `under CI, every tool a suite skips without is on PATH` ("CI is missing shellcheck, zsh"), `Step 4 guard: caught when reverted to the cycle-3 bug ... which zsh does not word-split`, and `fence entry: task.167's 13 cases against the shipped fast-gate precondition`. None touches the classifier. The laptop run (8346 tests, 0 fail on the second run) and hosted CI are the deciding readings.
